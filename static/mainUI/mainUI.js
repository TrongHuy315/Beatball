const rectangle_distance = 18; // khoảng cách giữa 2 hình chữ nhật 
const corner_radius = 4; 
const w = []; 
const h = []; 
const x = []; 
const y = []; 
const id_name = []; 

function apply_rectangle (id) {
	const element = document.getElementById(id_name[id]); 
	if (element) {
		element.style.position = 'absolute'; 
		element.style.left = `${x[id]}px`;
		element.style.top = `${y[id]}px`; 
		element.style.width = `${w[id]}px`; 
		element.style.height = `${h[id]}px`; 
		element.style.borderRadius = `${corner_radius}px`;
		element.style.backgroundColor = 'white';  
	}
}
function create_rectangle (xx, yy, ww, hh, id_namee) {
	x.push(xx); y.push(yy); w.push(ww); h.push(hh); id_name.push(id_namee); 
}

// ------------------ PROFILE-BOX --------------- (0)
create_rectangle(320, 30, 280, 90, "profile-box"); 
apply_rectangle(0); 

var tx, ty; 
// ------------------ ELO - BOX ----------------- (1)
ty = y[0] + h[0] + rectangle_distance; 
tx = x[0]; 
create_rectangle(tx, ty, 280, 150, "elo-box") 
apply_rectangle(1); 

// ------------------ MODE - BOX ---------------- (2)
ty = y[0]
tx = x[0] + w[0] + rectangle_distance; 
create_rectangle(tx, ty, 280, 200, "mode-box")
apply_rectangle(2);  
// ------------------ LEADERBOARD - BOX --------- (3)
ty = y[0]
tx = x[2] + w[2] + rectangle_distance; 
create_rectangle(tx, ty, 280, 80, "leaderboard-box")
apply_rectangle(3); 
// ------------------ STATS - BOX --------------- (4)
ty = y[3] + h[3] + rectangle_distance; 
tx = x[3]; 
create_rectangle(tx, ty, 280, 300, "stats-box")
apply_rectangle(4);
// ------------------ SETTINGS - BOX --------------- (5)
ty = y[2] + h[2] + rectangle_distance; 
tx = x[2]; 
create_rectangle(tx, ty, 280, 200, "settings-box")
apply_rectangle(5); 