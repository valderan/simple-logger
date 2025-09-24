import axios from 'axios';

async function ingestInvalidLog() {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
  const uuid = process.env.PROJECT_UUID ?? '00000000-0000-0000-0000-000000000000';

  try {
    await axios.post(`${apiUrl}/api/logs`, {
      uuid,
      log: {
        level: 'INFO',
        tags: ['TEST']
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Ошибка валидации:', error.response?.data);
    } else {
      console.error('Не удалось отправить лог:', error);
    }
  }
}

ingestInvalidLog().catch((error) => {
  console.error('Критическая ошибка', error);
});
