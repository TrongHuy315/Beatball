import pymunk

class Ball:
    def __init__(self, space, config, gamePhysics, x, y):
        self.space = space
        self.config = config
        self.damping = config["physics"]["damping"]
        
        # Tạo body và shape cho ball
        mass = config["physics"]["mass"]
        self.radius = config["physics"]["radius"]
        moment = pymunk.moment_for_circle(mass, 0, self.radius)
        
        self.body = pymunk.Body(mass, moment)
        self.body.position = (x, y)
        
        self.shape = pymunk.Circle(self.body, self.radius)
        self.shape.elasticity = config["physics"]["restitution"]
        self.shape.filter = pymunk.ShapeFilter(categories = 0b10)
        self.shape.friction = config["physics"]["friction"]
        self.shape.collision_type = gamePhysics.ballCollisionType
        
        space.add(self.body, self.shape)
        
    def update(self):
        current_vel = self.body.velocity
        self.body.velocity = (current_vel.x * self.damping, 
                            current_vel.y * self.damping)
    
    def reset(self):
        self.body.position = (self.config["width"] / 2, 
                            self.config["height"] / 2)
        self.body.velocity = (0, 0)
        self.damping = self.config["physics"]["damping"]
        
    def get_position(self):
        return self.body.position
        
    def get_velocity(self):
        return self.body.velocity
        
    def set_velocity(self, x, y):
        self.body.velocity = (x, y)
        
    def set_position(self, x, y):
        self.body.position = (x, y)