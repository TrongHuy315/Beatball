import pymunk
import math

class Player:
    def __init__(self, space, config, player_id, gamePhysics, x=200, y=200):
        self.gamePhysics = gamePhysics 
        self.space = space
        self.last_processed_input = 0
        self.config = config
        self.player_id = player_id
        self.spawn_x = x
        self.spawn_y = y
        self.isFreezeNormalShooting = False
        self.freezeNormalShootingTimer = 0
        
        # Lấy config
        self.player_config = config["player"]
        self.physics_config = self.player_config["physics"]
        self.graphic_config = self.player_config["graphic"]
        self.movement_config = self.player_config["movement"]

        self.radius = self.graphic_config["radius"]
        # Khởi tạo physics body
        self.body, self.shape = self._create_physics_body()
        
        # Movement type
        self.movement_type = self.player_config["movement"]["type"]
        
        # Kick config
        self.normalKickDistance = self.player_config["ballConfig"]["normalKickDistance"]
        self.normalKickVelocityAdd = self.player_config["ballConfig"]["normalKickVelocityAdd"]
    
    def _create_physics_body(self):
        # Tạo body
        mass = self.physics_config["mass"]
        radius = self.graphic_config["radius"]
        moment = pymunk.moment_for_circle(mass, 0, radius)
        body = pymunk.Body(mass, moment)
        body.position = (self.spawn_x, self.spawn_y)

        # Tạo shape
        shape = pymunk.Circle(body, radius)
        shape.friction = self.physics_config["friction"]
        shape.elasticity = self.physics_config["restitution"]
        
        shape.filter = pymunk.ShapeFilter(categories = 0b1, mask = 0b11111011)
        # Các thuộc tính khác
        body.angular_damping = self.physics_config["frictionAir"]
        body.moment = self.physics_config["inertia"]
        
        # Collision type
        shape.collision_type = self.gamePhysics.playerCollisionType  # player collision type
        
        # Thêm vào space
        self.space.add(body, shape)
        
        return body, shape

    def solveGoThroughBall(self): 
        ball = self.gamePhysics.ball
        ball_pos = ball.get_position()
        player_pos = self.get_position()
        ball_radius = ball.radius
        player_radius = self.radius
        allow_through_distance = 1 
        
        dx = player_pos.x - ball_pos.x
        dy = player_pos.y - ball_pos.y
        distance = math.sqrt(dx*dx + dy*dy)

        min_distance = ball_radius + player_radius - allow_through_distance
    
        if distance < min_distance and distance > 0:  
            unit_x = dx / distance
            unit_y = dy / distance
            new_player_x = ball_pos.x + unit_x * (player_radius + ball_radius)
            new_player_y = ball_pos.y + unit_y * (player_radius + ball_radius)
            
            self.set_position(new_player_x, new_player_y)
            
            ball_vel = ball.get_velocity()
            player_vel = self.get_velocity()

    def update(self):
        damping = self.physics_config["damping"]
        current_velocity = self.body.velocity
        new_velocity = (
            current_velocity.x * damping,
            current_velocity.y * damping
        )
        self.body.velocity = new_velocity
        if self.isFreezeNormalShooting:
            self.freezeNormalShootingTimer -= 1/60  # Giảm timer mỗi frame (60 FPS)
            if self.freezeNormalShootingTimer <= 0:
                self.isFreezeNormalShooting = False
                self.freezeNormalShootingTimer = 0
    
    def apply_movement(self, movement_input):
        if movement_input["kick"] and not self.isFreezeNormalShooting:
            self.perform_kicking()
        
        if self.movement_type == "force":
            self._apply_force_movement(movement_input)
        else:
            self._apply_velocity_movement(movement_input)
        if movement_input["sequence"] > self.last_processed_input:
            self.last_processed_input = movement_input["sequence"]

    def _apply_force_movement(self, movement_input):
        force_magnitude = self.movement_config["force"]
        max_speed = self.movement_config["maxSpeed"]
        
        # Normalize diagonal movement
        if movement_input["x"] != 0 and movement_input["y"] != 0:
            normalize = 1 / math.sqrt(2)
            force_x = movement_input["x"] * force_magnitude * normalize
            force_y = movement_input["y"] * force_magnitude * normalize
        else:
            force_x = movement_input["x"] * force_magnitude
            force_y = movement_input["y"] * force_magnitude
            
        current_velocity = self.body.velocity
        current_speed = math.sqrt(current_velocity.x**2 + current_velocity.y**2)
        
        if current_speed < max_speed:
            self.body.apply_force_at_local_point((force_x, force_y), (0, 0))

    def _apply_velocity_movement(self, movement_input):
        # Config từ JS
        acceleration = self.movement_config["acceleration"]
        max_speed = self.movement_config["maxSpeed"] * 60  # Convert to units/second
        
        current_velocity = self.body.velocity
        delta_time = movement_input["deltaTime"]
        
        inputX = movement_input["inputX"]
        inputY = movement_input["inputY"]
        
        # Tính toán velocity mới với delta time từ client
        new_velocity_x = current_velocity.x + inputX * acceleration * 60 * delta_time
        new_velocity_y = current_velocity.y + inputY * acceleration * 60 * delta_time

        # Giới hạn max speed (units/second)
        current_speed = math.sqrt(new_velocity_x**2 + new_velocity_y**2)
        if current_speed > max_speed:
            scale = max_speed / current_speed
            new_velocity_x *= scale
            new_velocity_y *= scale
        
        self.body.velocity = (new_velocity_x, new_velocity_y)

    def perform_kicking(self):
        print("Performing kicking")  
        ball = self.gamePhysics.ball
        if ball:
            player_pos = self.body.position
            ball_pos = ball.body.position
            
            distance = math.sqrt((player_pos.x - ball_pos.x)**2 + (player_pos.y - ball_pos.y)**2)
            
            # Lấy tổng bán kính của player và ball
            total_radius = self.graphic_config["radius"] + ball.config["physics"]["radius"]
            print("Total Radius", total_radius)
            print("Normal Kick Distance: ", self.normalKickDistance)  
            print("Total Allowed Distance: ", total_radius + self.normalKickDistance)
            print("Distance between player and ball: ", distance)
            
            if distance <= self.normalKickDistance + total_radius:
                print("Shooting successfully") 
                # Tính vector hướng từ player đến ball
                direction_x = ball_pos.x - player_pos.x
                direction_y = ball_pos.y - player_pos.y
                
                # Normalize vector
                length = math.sqrt(direction_x**2 + direction_y**2)
                if length > 0:
                    direction_x /= length
                    direction_y /= length
                    
                # Add thêm velocity thay vì gán
                current_vel = ball.body.velocity
                ball.body.velocity = (
                    current_vel.x + direction_x * self.normalKickVelocityAdd * 60,
                    current_vel.y + direction_y * self.normalKickVelocityAdd * 60
                )
                self.isFreezeNormalShooting = True
                self.freezeNormalShootingTimer = self.player_config["ballConfig"]["normalKickFreezeTime"]

    def reset(self):
        self.body.position = (self.spawn_x, self.spawn_y)
        self.body.velocity = (0, 0)

    def get_position(self):
        return self.body.position

    def get_velocity(self):
        return self.body.velocity

    def set_velocity(self, x, y):
        self.body.velocity = (x, y)

    def set_position(self, x, y):
        self.body.position = (x, y)