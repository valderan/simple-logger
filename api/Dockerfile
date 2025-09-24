FROM node:22.19.0

# Утилиты
RUN apt-get update && apt-get install -y \
    git curl vim sudo \
    && rm -rf /var/lib/apt/lists/*

# Делаем пользователя node sudoером
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

WORKDIR /workspace

# Копируем необходимые файлы
COPY ./package.json ./package-lock.json ./
COPY ./dist ./dist

# Устанавливаем зависимости
RUN npm install

# Переключаемся на пользователя node
USER node