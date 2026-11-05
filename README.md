# 🏗️ СтройCRM (SmallTestCMS)

Мини-CRM для строительной компании на базе **React**, **TypeScript**, **Vite** и **Supabase**.  
Управляет объектами, задачами и ролями (Постановщик / Исполнитель) с надёжной защитой данных на уровне базы данных.

📖 [Подробное описание системы для руководителя](./DESCRIPTION.md)

---

## 🚀 Быстрый запуск

### 1. Требования
Убедитесь, что у вас установлен [Node.js](https://nodejs.org/) (версия 18 или выше).

### 2. Клонирование и установка
```bash
git clone https://github.com/ABatatus/SmallTestCMS.git
cd SmallTestCMS
npm install

### 3. Настройка переменных окружения
Откройте .env и укажите:
```.env
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_public_ключ

### 4. Настройка базы данных
Откройте Supabase Dashboard.
Перейдите в **SQL Editor**.
Скопируйте весь код из файла database/setup.sql и нажмите **Run**.
В разделе Authentication → Users создайте тестовых пользователей (например, manager@stroy.ru и worker@stroy.ru) и вручную назначьте роль manager первому через SQL:
UPDATE profiles SET role = 'manager' WHERE email = 'manager@stroy.ru';

### 5. Запуск проекта
Локально выполните команду
```bash
npm run dev

Откройте в браузере: http://localhost:5173

### Сборка для продакшена
```bash
npm run build

Оптимизированные файлы появятся в папке dist/. Их можно задеплоить на Vercel, Netlify или любой статический хостинг.

## 🛠️ Стек технологий

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS
**Backend / DB**: Supabase (PostgreSQL, Row Level Security, Auth)