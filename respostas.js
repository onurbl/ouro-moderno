const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
    timeout: 60000
  });

  const page = await browser.newPage();

  try {
    console.log('Acessando página de login...');
    await page.goto('http://192.168.0.125/index.php?pag=login', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Preenchimento do formulário de login
    console.log('Preenchendo credenciais...');
    await page.type('input[name="aluno"]', 'tiago');
    await page.type('input[name="senha"]', '198569879');

    // Espera o botão de login aparecer e estar visível
    await page.waitForSelector('button[type="submit"]', { visible: true });

    // Garante que o botão está na tela
    await page.evaluate(() => {
      document.querySelector('button[type="submit"]').scrollIntoView();
    });

    // Clica no botão e espera o redirecionamento
    console.log('Enviando formulário...');
    await Promise.all([
      page.evaluate(() => {
        document.querySelector('button[type="submit"]').click();
      }),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);

    // Verifica se o login foi bem-sucedido
    if (page.url().includes('professor')) {
      console.log('Login realizado com sucesso!');
    } else {
      throw new Error('Falha no login - URL não redirecionou como esperado');
    }

    // Navegação direta para os gabaritos
    console.log('Acessando gabaritos...');
    await page.goto('http://192.168.0.125/index.php?pag=professor&secao=gabaritos&curso=441&aula=1', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Aguardando carregamento da tabela...');
    await page.waitForSelector('#teste .table', { timeout: 60000 });

    // Extração dos dados
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
