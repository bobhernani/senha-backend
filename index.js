const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json'));
const SPREADSHEET_ID = '1XhCG-O_ALX9zHrUOW-yIzwQ3qL7TrxKmGAF6vb_IRb8'; // Substitua pelo seu ID

async function getSheetClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

app.post('/api/alterar-senha', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  try {
    const sheets = await getSheetClient();

    // Lê os dados da planilha
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:D', // Colunas: Email, Senha, DataCadastro, DataExpiração
    });

    const rows = result.data.values;
    if (!rows || rows.length === 0) {
      return res.json({ success: false, message: 'Nenhum usuário encontrado.' });
    }

    const rowIndex = rows.findIndex(row => row[0] === email);
    if (rowIndex === -1) {
      return res.json({ success: false, message: 'Email não encontrado.' });
    }

    const userRow = rows[rowIndex];
    const senhaSalva = userRow[1];

    if (senhaSalva !== currentPassword) {
      return res.json({ success: false, message: 'Senha atual incorreta.' });
    }

    // Atualiza a senha
    
    const rowToUpdate = rowIndex + 2; // +2 por causa do cabeçalho e índice base 1
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!B${rowToUpdate}`, // Coluna B: Senha
      valueInputOption: 'RAW',
      requestBody: {
        values: [[newPassword]],
      },
    });

    return res.json({ success: true, message: 'Senha atualizada com sucesso!' });

  } catch (err) {
    console.error('Erro:', err);
    return res.status(500).json({ success: false, message: 'Erro ao alterar a senha.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
