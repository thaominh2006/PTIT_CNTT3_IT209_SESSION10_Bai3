# Giai đoạn 1 (builder): cài thư viện phụ thuộc
FROM node:18-alpine AS builder
WORKDIR /app

# Chép file khai báo phụ thuộc trước để tận dụng Build Cache
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Chép mã nguồn sau cùng, sửa code không làm mất cache của bước npm install
COPY . .

# Giai đoạn 2 (runtime): chỉ giữ lại sản phẩm cần để chạy
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./

# Chạy bằng user không phải root để an toàn hơn
USER node

EXPOSE 3000
CMD ["node", "server.js"]
