# Bài 3: Tối ưu dung lượng Image bằng Multi-stage Build

## 1. Mô tả

Refactor Dockerfile của ứng dụng Express ở ex2 sang Multi-stage Build. So sánh
hai image: `hw-backend:single` (single-stage, base `node:18`) và
`hw-backend:multistage` (2 giai đoạn, base `node:18-alpine`).

## 2. Cấu trúc

| Tệp | Vai trò |
|---|---|
| Dockerfile | Multi-stage: builder và runtime |
| Dockerfile.single | Single-stage dùng làm mốc so sánh |
| server.js, package.json | Mã nguồn API Express (tái sử dụng từ ex2) |
| .dockerignore | Loại node_modules và tệp không cần thiết |

## 3. Kỹ thuật áp dụng

| Kỹ thuật | Tác dụng |
|---|---|
| Base image Alpine | Giảm mạnh dung lượng nền so với bản Debian |
| Chép package*.json trước | Tận dụng Build Cache: sửa code không phải cài lại thư viện |
| COPY --from=builder | Chỉ lấy node_modules và server.js, bỏ phần còn lại của builder |
| npm install --omit=dev, npm cache clean | Không đưa devDependencies và cache vào image |
| USER node | Chạy bằng user thường, tăng bảo mật |

## 4. Bảng so sánh

| Tiêu chí | hw-backend:single | hw-backend:multistage | Chênh lệch |
|---|---|---|---|
| Base image | node:18 (Debian) | node:18-alpine | |
| Dung lượng (disk usage) | 1.58GB | 186MB | giảm khoảng 88,2% |
| Dung lượng (content size) | 398MB | 45.6MB | giảm khoảng 88,5% |
| Số layer (RootFS) | 11 | 8 | ít hơn 3 layer (khoảng 27%) |
| Thời gian build lần đầu | không ghi lại | 22.4s | |
| Build lại khi không đổi package.json | không đo | 5.2s, các bước npm install ở trạng thái CACHED | nhanh hơn khoảng 4 lần so với build lần đầu |

Cách đo: `docker images hw-backend` và
`docker inspect --format "{{len .RootFS.Layers}}" <image>`.

Đối chiếu với ex2 (single-stage trên `node:18-alpine`): `hw-backend:v1` có disk
usage 190MB và content size 46.4MB, gần như bằng image multistage (186MB và
45.6MB).

## 5. Kiểm tra

```powershell
docker build -f Dockerfile.single -t hw-backend:single .
docker build -t hw-backend:multistage .
docker images hw-backend
docker inspect --format "{{len .RootFS.Layers}}" hw-backend:single
docker inspect --format "{{len .RootFS.Layers}}" hw-backend:multistage
docker history hw-backend:multistage
docker run -d --name app-multistage -p 8081:3000 hw-backend:multistage
docker ps
docker logs app-multistage
curl.exe -i http://localhost:8081/
```

Kết quả: cả hai image build thành công, container `app-multistage` ở trạng thái
Up, `curl` trả về `HTTP/1.1 200 OK`, `Content-Type: application/json` và nội
dung:

```json
{"status":"success","message":"Xin chào từ Docker Multi-stage!"}
```

Khi build lại, các bước `COPY package*.json` và `RUN npm install` hiển thị
`CACHED`, thời gian build giảm từ 22.4s xuống 5.2s.

Ảnh minh chứng: `images.png`, `history.png`, `cache.png`, `curl.png`,
`ps_logs.png`.

## 6. Nhận xét

Image multistage nhỏ hơn image single khoảng 88% ở cả hai cách đo: disk usage
giảm từ 1.58GB xuống 186MB, content size giảm từ 398MB xuống 45.6MB. Content
size của image multistage nhỏ hơn 100MB nên đạt yêu cầu của đề; riêng disk usage
là 186MB vì cột này tính dung lượng sau khi giải nén trên đĩa. Số layer giảm từ
11 xuống 8.

Mức giảm chủ yếu đến từ việc đổi base image từ `node:18` (Debian) sang
`node:18-alpine`, không phải riêng nhờ multi-stage. Bằng chứng là image ex2
(single-stage trên `node:18-alpine`) chỉ nặng hơn image multistage khoảng 4MB
(190MB so với 186MB). Lý do là ứng dụng chỉ có một tệp `server.js`, không có
bước biên dịch nào cần bỏ lại ở giai đoạn builder. Với ứng dụng có bước build
(ví dụ React, TypeScript, Java), multi-stage sẽ cho mức giảm lớn hơn nhiều.

Kết quả `docker history hw-backend:multistage` cho thấy các layer do Dockerfile
tạo ra rất nhỏ (server.js 12.3kB, node_modules 4.67MB, package*.json 45.1kB),
phần lớn dung lượng thuộc về base image (layer cài Node.js khoảng 122MB). Vì
vậy muốn giảm thêm nữa cần chọn base image nhỏ hơn, không thể giảm thêm từ mã
nguồn.

Về Layer Caching, việc chép `package*.json` và chạy `npm install` trước khi chép
mã nguồn giúp các bước cài thư viện được dùng lại từ cache: lần build lại chỉ
mất 5.2s so với 22.4s ở lần đầu. Ngược lại, `Dockerfile.single` chép toàn bộ
mã nguồn (`COPY . .`) trước khi `npm install`, nên mỗi lần sửa code đều làm mất
cache của bước cài thư viện.