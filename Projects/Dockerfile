# ---- Stage 1 : build de la SPA React (Vite) ----
FROM node:20-slim AS frontend
WORKDIR /app/luckyenatisite
COPY luckyenatisite/package.json luckyenatisite/package-lock.json ./
RUN npm ci
COPY luckyenatisite/ ./
RUN npm run build

# ---- Stage 2 : runtime Flask (sert dist/ + API) ----
FROM python:3.12-slim
WORKDIR /app
COPY luckyenatiServer/requirements.txt ./luckyenatiServer/requirements.txt
RUN pip install --no-cache-dir -r luckyenatiServer/requirements.txt
COPY luckyenatiServer/ ./luckyenatiServer/
COPY --from=frontend /app/luckyenatisite/dist ./luckyenatisite/dist
CMD ["python", "luckyenatiServer/server.py"]
