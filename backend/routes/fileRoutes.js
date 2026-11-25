const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const File = require('../models/File');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/download/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') query.user = req.user.id;
    const file = await File.findOne(query).select('path originalname');
    if (!file) return res.status(404).json({ msg: 'File not found' });

    const uploadsDirectory = path.resolve(__dirname, '..', 'uploads');
    const filePath = path.resolve(__dirname, '..', file.path);
    if (!filePath.startsWith(`${uploadsDirectory}${path.sep}`)) {
      return res.status(404).json({ msg: 'File not found' });
    }
    return res.download(filePath, file.originalname);
  } catch (err) {
    console.error('File download error:', err.message);
    return res.status(500).json({ msg: 'Could not download file' });
  }
});

router.get('/:model/:id', auth, async (req, res) => {
  try {
    const { model, id } = req.params;

    // Validate the model to prevent arbitrary queries
    const allowedModels = ['Opportunity', 'Customer', 'Lead'];
    if (!allowedModels.includes(model)) {
      return res.status(400).json({ msg: 'Invalid model type.' });
    }

    const query = {
      relatedModel: model,
      relatedTo: id,
    };
    if (req.user.role !== 'admin') query.user = req.user.id;
    const files = await File.find(query).sort({ createdAt: -1 });

    res.json(files);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/files/upload
// @desc    Upload a file and link it to a record
// @access  Private
router.post('/upload', [auth, upload.single('file')], async (req, res) => {
  // 'file' in upload.single('file') must match the name attribute of the file input in the frontend form
  
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded.' });
    }

    const { relatedTo, relatedModel } = req.body;
    const records = {
      Opportunity: { model: Opportunity, ownerField: 'user' },
      Customer: { model: Customer, ownerField: 'user' },
      Lead: { model: Lead, ownerField: 'owner' },
    };
    if (!relatedTo || !records[relatedModel]) {
      await fs.promises.unlink(req.file.path);
      return res.status(400).json({ msg: 'Related record information is missing.' });
    }

    const recordQuery = { _id: relatedTo };
    if (req.user.role !== 'admin') recordQuery[records[relatedModel].ownerField] = req.user.id;
    const record = await records[relatedModel].model.findOne(recordQuery).select('_id');
    if (!record) {
      await fs.promises.unlink(req.file.path);
      return res.status(404).json({ msg: 'Related record not found' });
    }

    const newFile = new File({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: path.posix.join('uploads', req.file.filename),
      mimetype: req.file.mimetype,
      size: req.file.size,
      user: req.user.id,
      relatedTo: relatedTo,
      relatedModel: relatedModel
    });

    await newFile.save();
    
    // Send the new file's data back to the client
    res.status(201).json(newFile);

  } catch (err) {
    console.error(err.message);
    if (req.file?.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          console.error('Could not remove incomplete file upload:', cleanupError.message);
        }
      }
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
