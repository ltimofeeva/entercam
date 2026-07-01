# EnterCam — Car Access

Веб-приложение (PWA) для управления:
- Сотрудники: добавить/получить/удалить, машины сотрудника (добавить/удалить)
- Гости: добавить гостевую машину + даты, разрешить выезд
- Шлагбаум: лента "у ворот", разрешить выезд

## Запуск локально
```bash
npm i
npm run dev
```

## Сборка
```bash
npm run build
npm run preview
```

## Публикация (Vercel)
Содержимое приложения собирается в `dist/`. Vercel сам выполнит build.

**Рекомендуемые настройки Vercel:**
- Framework: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm i`

## Интеграция API (n8n / Entercam)
Смотри `src/lib/api.js` — туда подставляются реальные `fetch()` запросы.
