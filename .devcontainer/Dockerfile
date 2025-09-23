FROM node:22.19.0

# Утилиты
RUN apt-get update && apt-get install -y \
    git curl vim sudo \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем глобальные пакеты
RUN npm install -g typescript ts-node nodemon

# Делаем пользователя node sudoером
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

WORKDIR /workspace

# Переключаемся на пользователя node
USER node