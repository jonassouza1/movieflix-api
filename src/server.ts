import express from "express";
import database from "./infra/database";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";
import cors from "cors";
const helmet = require("helmet");
import * as path from "path";
import * as dotenv from "dotenv";


const envPath = path.resolve(__dirname, "../../.env.development");
dotenv.config({ path: envPath });
const port = process.env.PORT

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));


app.use(
  "/docs/static",
  express.static(path.dirname(require.resolve("swagger-ui-dist/index.html")))
);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://vercel.live"],
    },
  })
);

function transformTheFirstLetterOfThePhraseIntoUppercase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function checkExistenceOfValueAndConvertToDateFormat(release_date?: string) {
  return release_date ? new Date(release_date) : undefined;
}

app.get("/movies", async (req, res) => {
  const { sort } = req.query;
  const { language }: any = req.query;

  const languageName = language
    ? transformTheFirstLetterOfThePhraseIntoUppercase(language)
    : undefined;
  try {
    let queryText = `
      SELECT 
        title,release_date,genre_id,language_id,oscar_count,duration,
        genres.name genre_name,languages.name language_name
      FROM movies 
      JOIN genres on genres.id = genre_id
      JOIN languages on languages.id = language_id
      WHERE languages.name = $1 OR $1 IS NULL`;

    if (sort === "title") {
      queryText += " ORDER BY title ASC";
    } else if (sort === "release_date") {
      queryText += " ORDER BY release_date ASC";
    }
    const movies: any = await database.query(queryText, [languageName]);

    const moviesList = movies.rows;
    const allMovies = movies.rows.length;
    const transformArrayMovies = [...movies.rows];
    const sumDurationsAllmovies = transformArrayMovies.reduce(
      (total, atual) => total + atual.duration,
      0,
    );
    const averageLengthOfFilms =
      allMovies > 0 ? Math.round(sumDurationsAllmovies / allMovies) : 0;
    res.status(200).json({ allMovies, averageLengthOfFilms, moviesList });
  } catch (error) {
    res
      .status(500)
      .send({ message: "internal error when searching for movies" });
  }
});

app.post("/movies", async (req:any, res:any) => {
  const { title, release_date, genre_id, language_id, oscar_count } = req.body;
  try {
    const queryDuplicateMovieByTitle: any = await database.query(
      `SELECT COUNT(*) FROM movies WHERE LOWER(title) = LOWER($1)`,
      [title],
    );

    if (queryDuplicateMovieByTitle.rows[0].count > 0) {
      return res
        .status(409)
        .send({ message: "duplicate film, it is not possible to register" });
    }

    const titleConverted =
      transformTheFirstLetterOfThePhraseIntoUppercase(title);

    const releaseDate =
      checkExistenceOfValueAndConvertToDateFormat(release_date);

    await database.query(
      `INSERT INTO movies (title,release_date,genre_id,language_id,oscar_count)
     VALUES ($1,$2,$3,$4,$5);`,
      [titleConverted, releaseDate, genre_id, language_id, oscar_count],
    );
  } catch (error) {
    res.status(500).send({ message: "Failed to register movie" });
  }

  res.status(201).send({ message: "film registered successfully" });
});

app.put("/movies/:id", async (req:any, res:any) => {
  const id = Number(req.params.id);
  const { title, release_date, genre_id, language_id, oscar_count } = req.body;

  try {
    const titleConverted =
      transformTheFirstLetterOfThePhraseIntoUppercase(title);
    const releaseDate =
      checkExistenceOfValueAndConvertToDateFormat(release_date);
    const movie = await database.query(`SELECT * FROM movies WHERE id = $1`, [
      id,
    ]);
    if (movie?.rows.length == 0) {
      return res.status(404).send({ message: "this film doesn't exist" });
    }
    await database.query(
      `UPDATE movies SET title = $1, release_date = $2, genre_id = $3, language_id = $4, oscar_count = $5 WHERE id = $6 `,
      [titleConverted, releaseDate, genre_id, language_id, oscar_count, id],
    );
  } catch (error) {
    res.status(500).send({ message: "error when changing data" });
  }

  res.status(200).send({ message: "movie alteration in sucefull" });
});

app.get("/movies/:genre", async (req, res) => {
  const genreName = req.params.genre;
  try {
    const genreConverted =
      transformTheFirstLetterOfThePhraseIntoUppercase(genreName);

    const moviesFilteredByGenre = await database.query(
      `SELECT * FROM movies JOIN genres on genres.id = genre_id 
 WHERE genres.name = $1`,
      [genreConverted],
    );
    res.status(200).send(moviesFilteredByGenre?.rows);
  } catch (error) {
    res.status(500).send({ message: "error when filtering movie by genre" });
  }
});

app.delete("/movies/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await database.query(`DELETE FROM movies WHERE id = $1`, [id]);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete the movie" });
  }
  res.status(200).send({ message: "Successfully deleted movie" });
});

app.put("/genres/:id", async (req:any, res:any) => {
  const { name } = req.body;
  const id = req.params.id;
  const nameConverted = transformTheFirstLetterOfThePhraseIntoUppercase(name);
  if (!name) {
    return res.status(400).send({ message: "the name of genre is obrigatory" });
  }

  try {
    const genre = await database.query(`SELECT * FROM genres  WHERE id = $1`, [
      id,
    ]);

    if (genre?.rows.length == 0) {
      return res.status(404).send({ message: "this genre does not exist" });
    }
    await database.query(`UPDATE genres set name = $1 WHERE id = ${id}`, [
      nameConverted,
    ]);
  } catch (error) {
    res.status(500).send({ message: "error when changing data" });
  }
  res.status(200).send({ message: "genre alteration in sucefull" });
});

app.post("/genres", async (req:any, res:any) => {
  const { name } = req.body;
  const nameConverted = transformTheFirstLetterOfThePhraseIntoUppercase(name);
  if (!name) {
    return res.status(400).send({ message: "the name of genre is obrigatory" });
  }
  try {
    const queryDuplicateGenreByName: any = await database.query(
      `SELECT COUNT(*) FROM genres WHERE LOWER(name) = LOWER($1)`,
      [nameConverted],
    );

    if (queryDuplicateGenreByName.rows[0].count > 0) {
      return res
        .status(409)
        .send({ message: "duplicate genre, it is not possible to register" });
    }
    await database.query(`INSERT INTO genres (name) VALUES ($1)`, [
      nameConverted,
    ]);
  } catch (error) {
    res.status(500).send({ message: "Failed to register genre" });
  }
  res.status(201).send({ message: "Genre registered successfully" });
});
app.get("/genres", async (req, res) => {
  try {
    const getAllGenres = await database.query("SELECT * FROM genres");
    res.status(200).send(getAllGenres?.rows);
  } catch (error) {
    res
      .status(500)
      .send({ message: "There was a problem searching for genres." });
  }
});

app.delete("/genres/:id", async (req:any, res:any) => {
  const id = req.params.id;

  try {
    const queryGenderExistenceById: any = await database.query(
      `SELECT COUNT(*) FROM genres WHERE id = $1`,
      [id],
    );
    if (queryGenderExistenceById.rows[0].count == 0) {
      return res.status(400).send({ message: "gender not found" });
    }

    await database.query(`DELETE FROM genres WHERE id = $1`, [id]);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete the genre" });
  }
  res.status(200).send({ message: "Successfully deleted genre" });
});

app.listen(port, () => {
  console.log(`Servidor em execução na porta ${port} `);
});
