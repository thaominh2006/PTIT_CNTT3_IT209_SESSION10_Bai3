const express = require('express');
const app = express();

// Cổng lắng nghe lấy từ biến môi trường PORT, mặc định là 3000
const PORT = process.env.PORT || 3000;

// Endpoint gốc trả về JSON để kiểm tra ứng dụng hoạt động
app.get('/', (req, res) =>
  res.json({ status: 'success', message: 'Xin chào từ Docker Multi-stage!' })
);

app.listen(PORT, () => console.log(`Server đang lắng nghe tại cổng ${PORT}`));
