import express from 'express';
import { db } from '../connect.js';

const router = express.Router();

router.post('/comments/:id/reply', (req, res) => {
  try {
    const parentCommentId = req.params.id;
    const { text, author, like_count = 0, question_id } = req.body;

    const parentComment = db.prepare(`
      SELECT id, question_id
      FROM comments
      WHERE id = ?
    `).get(parentCommentId);

    if (!parentComment) {
      return res.status(404).json({
        status: 404,
        message: `Parent comment ${parentCommentId} not found`
      });
    }

    const result = db.prepare(`
      INSERT INTO comments (
        text,
        author,
        like_count,
        question_id,
        reply_to
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      text,
      author,
      like_count,
      question_id || parentComment.question_id,
      parentCommentId
    );

    res.status(201).json({
      status: 201,
      message: 'Reply created',
      reply: {
        id: result.lastInsertRowid,
        text,
        author,
        like_count,
        question_id: parentComment.question_id,
        reply_to: parentCommentId
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

router.post('/comments/:id/like', (req, res) => {
  try {
    const commentId = req.params.id;
    const result = db.prepare(`
      UPDATE comments
      SET like_count = like_count + 1
      WHERE id = ?
    `).run(commentId);

    if (result.changes === 0) {
      return res.status(404).json({
        status: 404,
        message: `Comment ${commentId} not found`
      });
    }

    res.status(200).json({
      status: 200,
      message: `Comment ${commentId} liked`
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
