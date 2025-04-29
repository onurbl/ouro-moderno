const puppeteer = require('puppeteer');
const readline = require('readline');
const fs = require('fs');
const url = require('url');

// Função para ler entrada do terminal
function perguntar(pergunta) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => rl.question(pergunta, resposta => {
    rl.close();
    resolve(resposta);
  }));
}

(async () => {
  // Pergunta ao usuário o link do aluno
  const linkAluno = await perguntar('Digite o link da prova do aluno: ');

  // Validação básica do link
  if (!linkAluno.includes('curso=') || !linkAluno.includes('aula=')) {
    console.error('Link inválido. Ele deve conter os parâmetros "curso" e "aula".');
    process.exit(1);
  }

  // Extrai os parâmetros do link do aluno
  const parsedUrl = new URL(linkAluno);
  const curso = parsedUrl.searchParams.get('curso');
  const aula = parsedUrl.searchParams.get('aula');

  // Monta o link do gabarito do professor
  const linkGabarito = `http://192.168.0.125/index.php?pag=professor&secao=gabaritos&curso=${curso}&aula=${aula}`;
  console.log(`Link do gabarito gerado: ${linkGabarito}`);

  // Puppeteer inicia
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
    timeout: 60000
  });

  const page = await browser.newPage();

  try {
    // Acessa página de login
    console.log('Acessando página de login...');
    await page.goto('http://192.168.0.125/index.php?pag=login', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Preenchendo credenciais...');
    await page.type('input[name="aluno"]', 'tiago');
    await page.type('input[name="senha"]', '198569879');

    await page.waitForSelector('button[type="submit"]', { visible: true });
    await page.evaluate(() => {
      document.querySelector('button[type="submit"]').scrollIntoView();
    });

    console.log('Enviando formulário...');
    await Promise.all([
      page.evaluate(() => {
        document.querySelector('button[type="submit"]').click();
      }),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);

    if (page.url().includes('professor')) {
      console.log('Login realizado com sucesso!');
    } else {
      throw new Error('Falha no login - URL não redirecionou como esperado');
    }

    // Acessa o gabarito com base no link gerado
    console.log('Acessando gabarito...');
    await page.goto(linkGabarito, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Aguardando carregamento da tabela...');
    await page.waitForSelector('#teste .table', { timeout: 60000 });

    console.log('Extraindo dados...');
    const dados = await page.evaluate(() => {
      const rows = document.querySelectorAll('#teste tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        return {
          numero: cells[0]?.textContent.trim(),
          pergunta: cells[1]?.textContent.trim(),
          resposta: cells[2]?.textContent.trim(),
          classe: row.className.includes('corsim') ? 'corsim' : 'cornao'
        };
      });
    });

    console.log('\nRESULTADOS OBTIDOS:');
    console.table(dados);

    fs.writeFileSync('gabaritos.json', JSON.stringify(dados, null, 2));
    console.log('Dados salvos em gabaritos.json');

  } catch (error) {
    console.error('Ocorreu um erro:', error);
    await page.screenshot({ path: 'erro.png' });
    console.log('Captura de tela salva como erro.png');
  } finally {
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
})();
