const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const credentials = require('./credentials.json'); // Caminho correto para o arquivo

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});


app.use(cors());
app.use(express.json());

// Configuração do Google Auth
function getAuthClient() {
  // Corrige a formatação da chave privada (substitui \n por quebras de linha reais)
  const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
  
  return new google.auth.JWT({
    email: process.env.CLIENT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const SPREADSHEET_ID = '1XhCG-O_ALX9zHrUOW-yIzwQ3qL7TrxKmGAF6vb_IRb8';

// Função para gerar hash SHA-256
function hashSenha(senha) {
  return crypto.createHash('sha256').update(senha).digest('hex');
}

// Endpoint para alterar a senha
app.post('/api/alterar-senha', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  try {
    const authClient = getAuthClient();
    await authClient.authorize(); // Autentica explicitamente
    
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Obtém os dados da planilha
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:D',
    });

    const rows = result.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === email);
    
    if (rowIndex === -1) {
      return res.status(404).json({ success: false, message: 'Email não encontrado.' });
    }

    const rowToUpdate = rowIndex + 2;
    const senhaNaPlanilha = rows[rowIndex][1] || '';
    const hashAtual = hashSenha(currentPassword);

    if (hashAtual !== senhaNaPlanilha) {
      return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
    }

    // Atualiza a senha
    const novaSenhaHash = hashSenha(newPassword);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!B${rowToUpdate}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[novaSenhaHash]],
      },
    });

    res.json({ success: true, message: 'Senha atualizada com sucesso!' });
  } catch (err) {
    console.error('Erro detalhado:', err.message, err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao alterar a senha.',
      error: err.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});