# NexusHub Admin — подключение DeepSeek

## Что изменилось

- В **API Keys** можно создать, изменить и активировать ключ DeepSeek.
- В **AI Models** можно создать и активировать модель DeepSeek.
- Провайдеры загружаются из `GET /api/ai-models/providers`; OpenAI, Anthropic и DeepSeek остаются встроенным резервным списком на случай временной недоступности этого endpoint.
- Для DeepSeek автоматически предлагается `deepseek-flash`, также доступна подсказка `deepseek-v4-pro`.
- Админка показывает, настроен ли `DEEPSEEK_API_KEY` на backend, не раскрывая значение секрета.

## Порядок развёртывания в Railway

1. Сначала разверните обновлённый **backend**.
2. Один раз выполните миграцию в сервисе backend:

   ```bash
   pnpm db:migrate:deepseek
   ```

   Она добавляет DeepSeek в ограничения БД и создаёт неактивную модель **DeepSeek Flash**. Повторный запуск безопасен.

3. Разверните эту версию **admin** обычной Railway-командой. Проект рассчитан на Node.js 22+ и pnpm 11.19.0:

   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   pnpm start
   ```

4. Проверьте `VITE_API_BASE` в admin: это URL backend без завершающего `/api`. Переменная является build-time, поэтому после её изменения нужен новый deploy/rebuild admin.

## Включение DeepSeek

Есть два варианта ключа:

### Через админку

1. Откройте **API Keys** → **Add Key**.
2. Выберите **DeepSeek**, вставьте ключ и включите **Activate immediately for this provider**.
3. Откройте **AI Models**.
4. Активируйте созданную миграцией **DeepSeek Flash** либо добавьте другую модель DeepSeek.

Ключ хранится на backend и после сохранения полностью не показывается. При смене провайдера у существующей записи интерфейс потребует новый секрет, чтобы ключ одного провайдера случайно не использовался для другого.

### Через переменную backend

Добавьте `DEEPSEEK_API_KEY` в Variables именно сервиса backend, затем redeploy backend. По желанию можно задать:

```text
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

После этого в **AI Models** можно оставить **Key = Auto**. `DEEPSEEK_API_KEY` не нужно добавлять в сервис admin.

## Ограничение

DeepSeek получает переданный приложением контекст, но текущая backend-интеграция не подключает к нему серверные инструменты web search/web fetch. Админка показывает это предупреждение в форме модели.

## Проверка перед деплоем

```bash
pnpm test:ai-providers
pnpm test:subscriptions
pnpm build
```
