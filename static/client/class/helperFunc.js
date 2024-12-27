function hexToRGB(hex) {
    const r = (hex >> 16) & 0xFF;
    const g = (hex >> 8) & 0xFF;
    const b = hex & 0xFF;
    return { r, g, b };
}

function rgbStringToHex(rgb) {
    // Thêm hàm này nếu bạn chưa có
    // Chuyển đổi từ string rgb(r,g,b) sang hex
    if (typeof rgb === 'string') {
        const values = rgb.match(/\d+/g);
        if (values) {
            return (parseInt(values[0]) << 16) + 
                   (parseInt(values[1]) << 8) + 
                   parseInt(values[2]);
        }
    }
    return rgb; // Trả về nguyên giá trị nếu không phải string
}
function hexToRGBA(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b, a: alpha };
}