import express from 'express';
import { db } from '../connect.js';

const router = express.Router();

router.get('/api/qlist', (req, res) => {
  try {
    const questions = db.prepare(`
      SELECT
        q.id,
        q.title,
        q.description,
        q.author,
        q.like_count,
        q.creation_date,
        COUNT(c.id) AS comment_count
      FROM questions q
      LEFT JOIN comments c
        ON q.id = c.question_id
      GROUP BY q.id
      ORDER BY q.creation_date DESC;
    `).all();

    res.status(200).json({
      status: 200,
      questions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      message: err.message
    });
  }
});

router.post('/api/question', (req, res) => {
  try {
    const result = db.prepare(`
      INSERT INTO questions (
        title,
        description,
        author,
        like_count
      ) VALUES (?, ?, ?, ?)
    `).run(
      req.body.title,
      req.body.description,
      req.body.author,
      req.body.like_count ?? 0
    );

    res.status(201).json({
      status: 201,
      message: `Question ${result.lastInsertRowid} saved.`,
      id: result.lastInsertRowid
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      message: err.message
    });
  }
});

router.get('/api/question/:id', (req, res) => {
  try {
    const questionId = req.params.id;

    const question = db.prepare(`
      SELECT
        id,
        title,
        description,
        author,
        like_count,
        creation_date
      FROM questions
      WHERE id = ?
    `).get(questionId);

    if (!question) {
      return res.status(404).json({
        status: 404,
        message: `Question with id ${questionId} not found`
      });
    }

    const comments = db.prepare(`
      SELECT
        id,
        text,
        author,
        like_count,
        question_id,
        reply_to,
        creation_date
      FROM comments
      WHERE question_id = ?
      ORDER BY creation_date ASC
    `).all(questionId);

    const commentMap = new Map();
    const rootComments = [];

    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach((comment) => {
      const commentNode = commentMap.get(comment.id);

      if (comment.reply_to) {
        const parent = commentMap.get(comment.reply_to);
        if (parent) {
          parent.replies.push(commentNode);
        }
      } else {
        rootComments.push(commentNode);
      }
    });

    res.status(200).json({
      status: 200,
      question: {
        ...question,
        comments: rootComments
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      message: err.message
    });
  }
});

router.post('/questions/:id/like', (req, res) => {
  try {
    const questionId = req.params.id;
    const result = db.prepare(`
      UPDATE questions
      SET like_count = like_count + 1
      WHERE id = ?
    `).run(questionId);

    if (result.changes === 0) {
      return res.status(404).json({
        status: 404,
        message: `Question ${questionId} not found`
      });
    }

    res.status(200).json({
      status: 200,
      message: `Question ${questionId} liked`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      message: err.message
    });
  }
});

router.post('/questions/:id/comment', (req, res) => {
  try {
    const questionId = req.params.id;
    const { text, author, like_count = 0 } = req.body;

    const question = db.prepare(`
      SELECT id
      FROM questions
      WHERE id = ?
    `).get(questionId);

    if (!question) {
      return res.status(404).json({
        status: 404,
        message: `Question ${questionId} not found`
      });
    }

    const result = db.prepare(`
      INSERT INTO comments (
        text,
        author,
        like_count,
        question_id,
        reply_to
      ) VALUES (?, ?, ?, ?, NULL)
    `).run(text, author, like_count, questionId);

    res.status(201).json({
      status: 201,
      message: 'Comment added',
      comment: {
        id: result.lastInsertRowid,
        text,
        author,
        like_count,
        question_id: questionId,
        reply_to: null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      message: err.message
    });
  }
});

export default router;
