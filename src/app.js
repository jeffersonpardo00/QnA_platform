import Database from 'better-sqlite3';

const db = new Database('qna.db');

const query = `
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    like_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    like_count INTEGER NOT NULL DEFAULT 0,
    question_id INTEGER NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );
`;

db.exec(query);


const question_data = [
  {
    title: "What is an atom?",
    description: "I've always wondered because an atom is not considered the smallest particle anymore. What exactly is an atom, and how is it different from particles like quarks and electrons?",
    author: "Carlitos Castro",
    like_count: 1
  },
  {
    title: "Why is the sky blue?",
    description: "I know it has something to do with sunlight and the atmosphere, but I'd like a simple explanation of why we see the sky as blue during the day.",
    author: "Emily Johnson",
    like_count: 2
  },
  {
    title: "How do databases use primary keys?",
    description: "I'm learning SQL and I'm confused about why every table needs a primary key and how foreign keys relate to them.",
    author: "Jeff Brown",
    like_count: 3
  }
];

const comment_data = [
  {
    text: "An atom is the smallest unit of an element that still retains its chemical properties. It's made up of protons and neutrons in the nucleus, with electrons surrounding it. Quarks are even smaller particles that make up protons and neutrons.",
    author: "Dr. Sarah Kim",
    like_count: 0,
    question_id: 1
  },
  {
    text: "The sky appears blue because molecules in Earth's atmosphere scatter blue light from the Sun more strongly than other colors. This effect is called Rayleigh scattering.",
    author: "Michael Lee",
    like_count: 0,
    question_id: 2
  },
  {
    text: "A primary key uniquely identifies each row in a table, while a foreign key creates a relationship by referencing the primary key of another table. This helps maintain data integrity.",
    author: "Ana Rodríguez",
    like_count: 0,
    question_id: 3
  }
];

const insertQuesData = db.prepare(
    `INSERT INTO questions (
        title,
        description,
        author,
        like_count
    ) VALUES (?,?,?,?)`
);

question_data.forEach((question) => {
    insertQuesData.run(
        question.title,
        question.description,
        question.author,
        question.like_count
    );
});

const insertResData = db.prepare(
    `INSERT INTO comments (
        text,
        author,
        like_count,
        question_id
    ) VALUES (?,?,?,?)`
);

comment_data.forEach((comment) => {
    insertResData.run(
        comment.text,
        comment.author,
        comment.like_count,
        comment.question_id
    );
});

db.close();

const querySelect = 'SELECT * FROM questions';
const questions = db.prepare(querySelect).all();

console.log(questions);

const queryS1 = 'SELECT * FROM questions WHERE id = ?';
const question = db.prepare(queryS1).get(1);

console.log(question);

db.close();

import express from 'express';
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  const querySelAll = 'SELECT * FROM questions';
  const questions = db.prepare(querySelAll).all();
  res.json({questions: questions});
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});