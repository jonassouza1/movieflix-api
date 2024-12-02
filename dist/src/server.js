"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("./infra/database"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_json_1 = __importDefault(require("../swagger.json"));
const helmet = require("helmet");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const envPath = path.resolve(__dirname, "../../.env.development");
dotenv.config({ path: envPath });
const port = process.env.PORT;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_json_1.default));
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'", "https://vercel.live"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "https://vercel.live"]
    }
}));
function transformTheFirstLetterOfThePhraseIntoUppercase(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
function checkExistenceOfValueAndConvertToDateFormat(release_date) {
    return release_date ? new Date(release_date) : undefined;
}
app.get("/movies", async (req, res) => {
    const { sort } = req.query;
    const { language } = req.query;
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
        }
        else if (sort === "release_date") {
            queryText += " ORDER BY release_date ASC";
        }
        const movies = await database_1.default.query(queryText, [languageName]);
        const moviesList = movies.rows;
        const allMovies = movies.rows.length;
        const transformArrayMovies = [...movies.rows];
        const sumDurationsAllmovies = transformArrayMovies.reduce((total, atual) => total + atual.duration, 0);
        const averageLengthOfFilms = allMovies > 0 ? Math.round(sumDurationsAllmovies / allMovies) : 0;
        res.status(200).json({ allMovies, averageLengthOfFilms, moviesList });
    }
    catch (error) {
        res
            .status(500)
            .send({ message: "internal error when searching for movies" });
    }
});
app.post("/movies", async (req, res) => {
    const { title, release_date, genre_id, language_id, oscar_count } = req.body;
    try {
        const queryDuplicateMovieByTitle = await database_1.default.query(`SELECT COUNT(*) FROM movies WHERE LOWER(title) = LOWER($1)`, [title]);
        if (queryDuplicateMovieByTitle.rows[0].count > 0) {
            return res
                .status(409)
                .send({ message: "duplicate film, it is not possible to register" });
        }
        const titleConverted = transformTheFirstLetterOfThePhraseIntoUppercase(title);
        const releaseDate = checkExistenceOfValueAndConvertToDateFormat(release_date);
        await database_1.default.query(`INSERT INTO movies (title,release_date,genre_id,language_id,oscar_count)
     VALUES ($1,$2,$3,$4,$5);`, [titleConverted, releaseDate, genre_id, language_id, oscar_count]);
    }
    catch (error) {
        res.status(500).send({ message: "Failed to register movie" });
    }
    res.status(201).send({ message: "film registered successfully" });
});
app.put("/movies/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { title, release_date, genre_id, language_id, oscar_count } = req.body;
    try {
        const titleConverted = transformTheFirstLetterOfThePhraseIntoUppercase(title);
        const releaseDate = checkExistenceOfValueAndConvertToDateFormat(release_date);
        const movie = await database_1.default.query(`SELECT * FROM movies WHERE id = $1`, [
            id,
        ]);
        if ((movie === null || movie === void 0 ? void 0 : movie.rows.length) == 0) {
            return res.status(404).send({ message: "this film doesn't exist" });
        }
        await database_1.default.query(`UPDATE movies SET title = $1, release_date = $2, genre_id = $3, language_id = $4, oscar_count = $5 WHERE id = $6 `, [titleConverted, releaseDate, genre_id, language_id, oscar_count, id]);
    }
    catch (error) {
        res.status(500).send({ message: "error when changing data" });
    }
    res.status(200).send({ message: "movie alteration in sucefull" });
});
app.get("/movies/:genre", async (req, res) => {
    const genreName = req.params.genre;
    try {
        const genreConverted = transformTheFirstLetterOfThePhraseIntoUppercase(genreName);
        const moviesFilteredByGenre = await database_1.default.query(`SELECT * FROM movies JOIN genres on genres.id = genre_id 
 WHERE genres.name = $1`, [genreConverted]);
        res.status(200).send(moviesFilteredByGenre === null || moviesFilteredByGenre === void 0 ? void 0 : moviesFilteredByGenre.rows);
    }
    catch (error) {
        res.status(500).send({ message: "error when filtering movie by genre" });
    }
});
app.delete("/movies/:id", async (req, res) => {
    const id = req.params.id;
    try {
        await database_1.default.query(`DELETE FROM movies WHERE id = $1`, [id]);
    }
    catch (error) {
        res.status(500).send({ message: "Failed to delete the movie" });
    }
    res.status(200).send({ message: "Successfully deleted movie" });
});
app.put("/genres/:id", async (req, res) => {
    const { name } = req.body;
    const id = req.params.id;
    const nameConverted = transformTheFirstLetterOfThePhraseIntoUppercase(name);
    if (!name) {
        return res.status(400).send({ message: "the name of genre is obrigatory" });
    }
    try {
        const genre = await database_1.default.query(`SELECT * FROM genres  WHERE id = $1`, [
            id,
        ]);
        if ((genre === null || genre === void 0 ? void 0 : genre.rows.length) == 0) {
            return res.status(404).send({ message: "this genre does not exist" });
        }
        await database_1.default.query(`UPDATE genres set name = $1 WHERE id = ${id}`, [
            nameConverted,
        ]);
    }
    catch (error) {
        res.status(500).send({ message: "error when changing data" });
    }
    res.status(200).send({ message: "genre alteration in sucefull" });
});
app.post("/genres", async (req, res) => {
    const { name } = req.body;
    const nameConverted = transformTheFirstLetterOfThePhraseIntoUppercase(name);
    if (!name) {
        return res.status(400).send({ message: "the name of genre is obrigatory" });
    }
    try {
        const queryDuplicateGenreByName = await database_1.default.query(`SELECT COUNT(*) FROM genres WHERE LOWER(name) = LOWER($1)`, [nameConverted]);
        if (queryDuplicateGenreByName.rows[0].count > 0) {
            return res
                .status(409)
                .send({ message: "duplicate genre, it is not possible to register" });
        }
        await database_1.default.query(`INSERT INTO genres (name) VALUES ($1)`, [
            nameConverted,
        ]);
    }
    catch (error) {
        res.status(500).send({ message: "Failed to register genre" });
    }
    res.status(201).send({ message: "Genre registered successfully" });
});
app.get("/genres", async (req, res) => {
    try {
        const getAllGenres = await database_1.default.query("SELECT * FROM genres");
        res.status(200).send(getAllGenres === null || getAllGenres === void 0 ? void 0 : getAllGenres.rows);
    }
    catch (error) {
        res
            .status(500)
            .send({ message: "There was a problem searching for genres." });
    }
});
app.delete("/genres/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const queryGenderExistenceById = await database_1.default.query(`SELECT COUNT(*) FROM genres WHERE id = $1`, [id]);
        if (queryGenderExistenceById.rows[0].count == 0) {
            return res.status(400).send({ message: "gender not found" });
        }
        await database_1.default.query(`DELETE FROM genres WHERE id = $1`, [id]);
    }
    catch (error) {
        res.status(500).send({ message: "Failed to delete the genre" });
    }
    res.status(200).send({ message: "Successfully deleted genre" });
});
app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port} `);
});
