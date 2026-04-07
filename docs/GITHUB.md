# Публикация на GitHub (HTTPS, без SSH)

Репозиторий уже инициализирован локально (`main`), remote не настроен.

1. Создайте **пустой** репозиторий на GitHub (без README/LICENSE, если хотите без merge-конфликта при первом push).

2. В корне этого проекта выполните (подставьте свой URL):

   ```bash
   git remote add origin https://github.com/<USER>/<REPO>.git
   git push -u origin main
   ```

3. При запросе пароля GitHub используйте **Personal Access Token** (Settings → Developer settings), не пароль от аккаунта.

4. Позже можно перейти на SSH:

   ```bash
   git remote set-url origin git@github.com:<USER>/<REPO>.git
   ```

Локальные секреты не в репозитории: скопируйте `.env.example` → `.env` и `pet-app/.env.example` → `pet-app/.env` на новой машине.
