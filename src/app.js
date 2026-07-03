import express from 'express';
import {db} from './connect.js';
const app = express();
app.use(express.json());
const port = 3000;

app.get('/', (req, res) => {
  res.status(200);
  res.send('Question service is online');
});

// question list-------------------------------------------------------------
const getQuestionsStmt = db.prepare(`
  SELECT
    q.id,
    q.title,
    q.description,
    q.author,
    q.like_count,
    COUNT(c.id) AS comment_count
  FROM questions q
  LEFT JOIN comments c
    ON q.id = c.question_id
  GROUP BY q.id;
`);

app.get('/api/qlist', (req, res) => {
  try {
    const questions = getQuestionsStmt.all();

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

//------------------------------------------------------------------------
const insertQuestionStmt = db.prepare(`
  INSERT INTO questions (
    title,
    description,
    author,
    like_count
  ) VALUES (?, ?, ?, ?)
`);
app.post('/api/question', (req, res) => {
  console.log(req.body);

  try {
    const result = insertQuestionStmt.run(
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

//-------------------------------------------------------------------------------------------
app.get('/api/question/:id', (req, res) => {
  try {
    const questionId = req.params.id;

    // 1. Get question
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

    // 2. Get ALL comments (same question)
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

    // 3. Split comments into parents and replies
    const commentMap = new Map();
    const rootComments = [];

    // initialize all comments
    comments.forEach(c => {
      commentMap.set(c.id, { ...c, replies: [] });
    });

    // build 1-level structure only
    comments.forEach(c => {
      const comment = commentMap.get(c.id);

      if (c.reply_to) {
        const parent = commentMap.get(c.reply_to);

        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    // 4. return response
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

//-------------------------------------------------------------------------------------------
app.post('/comments/:id/reply', (req, res) => {
  try {
    const parentCommentId = req.params.id;

    const { text, author, like_count = 0, question_id } = req.body;

    // 1. Check parent comment exists
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

    // 2. Insert reply comment
    const insertStmt = db.prepare(`
      INSERT INTO comments (
        text,
        author,
        like_count,
        question_id,
        reply_to
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      text,
      author,
      like_count,
      question_id || parentComment.question_id, // fallback safety
      parentCommentId
    );

    // 3. Response
    res.status(201).json({
      status: 201,
      message: `Reply created`,
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

//----------------------------------------------------
app.post('/questions/:id/comment', (req, res) => {
  try {
    const questionId = req.params.id;

    const { text, author, like_count = 0 } = req.body;

    // 1. Check question exists
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

    // 2. Insert comment (top-level, no reply_to)
    const stmt = db.prepare(`
      INSERT INTO comments (
        text,
        author,
        like_count,
        question_id,
        reply_to
      ) VALUES (?, ?, ?, ?, NULL)
    `);

    const result = stmt.run(
      text,
      author,
      like_count,
      questionId
    );

    // 3. Response
    res.status(201).json({
      status: 201,
      message: "Comment added",
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

//-------------------------------------------------------------------------------------------
app.post('/questions/:id/like', (req, res) => {
  try {
    const questionId = req.params.id;

    const stmt = db.prepare(`
      UPDATE questions
      SET like_count = like_count + 1
      WHERE id = ?
    `);

    const result = stmt.run(questionId);

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

//-----------------------------------------------------------------------------------------
app.post('/comments/:id/like', (req, res) => {
  try {
    const commentId = req.params.id;

    const stmt = db.prepare(`
      UPDATE comments
      SET like_count = like_count + 1
      WHERE id = ?
    `);

    const result = stmt.run(commentId);

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

//--------------------------------------------------------------------------------------------


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});