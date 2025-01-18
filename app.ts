const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

// Путь к видео
const inputPath = fs.readdirSync("./input");

// Функция для получения продолжительности видео

interface MetaData {
  format: {
    duration: number;
  };
}

function getVideoDuration(filePath: string) {
  return new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: Error, metadata: MetaData) => {
      if (err) reject(err);
      const duration: number = metadata.format.duration; // в секундах
      resolve(duration);
    });
  });
}

// Функция компрессии
async function compressVideo(
  inputPath: string,
  outputPath: string,
  desiredSizeMB: number,
  preset: string
) {
  return new Promise(async (resolve, reject) => {
    try {
      // Получаем продолжительность видео
      const duration: number = await getVideoDuration(inputPath);

      // Рассчитываем битрейт
      const desiredSizeKB = desiredSizeMB * 1024; // Конвертируем размер в КБ
      const bitrate = Math.floor((desiredSizeKB * 8) / duration); // Битрейт в кбит/с

      console.log(
        `\x1b[42m   Рассчитанный битрейт: ${bitrate} кбит/с \x1b[0m `
      );
      let dots = "";
      let interval = setInterval(() => {
        dots += ".";
        if (dots.length > 3) {
          dots = "";
        }
        process.stdout.write(`Компрессируется${dots}\r`); // \r возвращает курсор в начало строки
      }, 500);
      // Компрессия видео
      ffmpeg(inputPath)
        .videoBitrate(bitrate) // Устанавливаем рассчитанный битрейт
        .outputOptions("-preset", preset) // Предустановка качества компрессии
        .outputOptions("-movflags", "faststart") // Для оптимизации прогрессивного воспроизведения
        .save(outputPath)
        .on("end", () => {
          resolve(`\x1b[42m    Видео успешно сжато: ${outputPath} \x1b[0m `);
          clearInterval(interval);
        })
        .on("error", (err: Error) => {
          reject(
            `\x1b[41m    Ошибка при сжатии видео: ${err.message} \x1b[0m `
          );
        });
    } catch (error) {
      reject(`Ошибка: ${error}`);
    }
  });
}
async function makeFilesArray(data: Array<File>) {
  const dataArray: Array<File> = await Promise.all(
    data.map(async (el, index) => {
      return {
        index: index + 1,
        fileName: el,
        path: "./input/" + el,
      } as unknown as File;
    })
  );
  return dataArray;
}

interface File {
  index: number;
  fileName: string;
  path: string;
}

let readline = require("readline");
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string) {
  return new Promise<string>((resolve) => {
    rl.question(query, resolve);
  });
}
const presets = [
  "ultrafast", // Очень быстрое кодирование
  "superfast", // Быстрое кодирование
  "veryfast", // Очень быстрое, но с немного лучшим качеством
  "faster", // Умеренно быстрое кодирование
  "fast", // Хорошее качество с быстрым кодированием
  "medium", // Стандартное качество (по умолчанию)
  "slow", // Более медленное кодирование, но лучшее качество
  "slower", // Медленное кодирование с отличным качеством
  "veryslow", // Очень медленное кодирование с максимальным качеством
  "placebo", // Максимальное качество, но с максимальными затратами времени
];
const presetsLog = [
  "ultrafast - Очень быстрое кодирование\x1b[0m",
  "superfast - Быстрое кодирование\x1b[0m",
  "veryfast - Очень быстрое, но с немного лучшим качеством\x1b[0m",
  "faster - Умеренно быстрое кодирование\x1b[0m",
  "fast - Хорошее качество с быстрым кодированием (рекомендуется)\x1b[0m",
  "medium - Стандартное качество (по умолчанию)\x1b[0m",
  "slow - Более медленное кодирование, но лучшее качество\x1b[0m",
  "slower - Медленное кодирование с отличным качеством\x1b[0m",
  "veryslow - Очень медленное кодирование с максимальным качеством\x1b[0m",
  "placebo - Максимальное качество, но с максимальными затратами времени\x1b[0m",
];
const colors = [34, 70, 106, 142, 178, 214, 215, 216, 217, 181];

async function logPresetsArray() {
  await Promise.all(
    presetsLog.map(async (el, index) => {
      console.log(`\x1b[38;5;${colors[index]}m ${el}`);
      return null;
    })
  );
}

async function init() {
  const filesArray: Array<File> = await makeFilesArray(inputPath);
  for (const file of filesArray)
    console.log(`\x1b[32m ${file.index} | ${file.fileName} \x1b[0m`);
  if (filesArray.length == 0) {
    return console.log(
      'Нет файлов в папке "input", переместите туда файлы которые хотите скомпрессировать'
    );
  }

  let inputFile: File;
  let inputSize: number;

  await askQuestion(
    "\x1b[31m Введите индекс файла который хотите компрессировать \x1b[0m\n > "
  ).then((value) => {
    const findFile: File | undefined = filesArray.find(
      (el) => el.index == parseInt(value)
    );
    if (!findFile)
      return console.log("Скорее всего вы удалили файл из нужной папки!");
    inputFile = findFile;
  });
  await askQuestion(
    "\x1b[31m Введите нужный вам размер в МегаБайтах(МБайт) (ОБЯЗАТЕЛЬНО ЧИСЛОМ!) \x1b[0m\n > "
  ).then(async (value) => {
    inputSize = parseFloat(value);
    await logPresetsArray();
  });
  await askQuestion(" > ").then(async (value) => {
    if (!presets.includes(value)) {
      console.log("Такого пресета нету!");
      return init();
    }
    await compressVideo(
      inputFile.path,
      `./output/${inputFile.fileName}`,
      inputSize,
      value
    )
      .then((res) => {
        console.log(res);
        init();
      })
      .catch((rej) => {
        console.log(rej);
        init();
      });
  });
}

init().catch((err) => {
  console.log(err);
});

/*
compressVideo(inputPath, outputPath, desiredSizeMB);
*/
