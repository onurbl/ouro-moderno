const puppeteer = require('puppeteer');

(async () => {
  // Configuração do navegador
  const browser = await puppeteer.launch({
    headless: false, // Altere para true depois de testar
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
    
    // Submissão do formulário
    console.log('Enviando formulário...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);

    // Verifica se o login foi bem-sucedido
    if (page.url().includes('professor')) {
      console.log('Login realizado com sucesso!');
    } else {
      throw new Error('Falha no login - URL não redirecionou como esperado');
    }

    // Navegação direta para os gabaritos do curso 441, aula 1
    console.log('Acessando gabaritos...');
    await page.goto('http://192.168.0.125/index.php?pag=professor&secao=gabaritos&curso=441&aula=1', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Espera pela tabela de resultados
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

    // Exibição dos resultados
    console.log('\nRESULTADOS OBTIDOS:');
    console.table(dados);

    // Geração de relatório em arquivo (opcional)
    const fs = require('fs');
    fs.writeFileSync('gabaritos.json', JSON.stringify(dados, null, 2));
    console.log('Dados salvos em gabaritos.json');

  } catch (error) {
    console.error('Ocorreu um erro:', error);
    await page.screenshot({ path: 'erro.png' });
    console.log('Captura de tela salva como erro.png');
  } finally {
    // Fechamento do navegador após 10 segundos
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
})();
