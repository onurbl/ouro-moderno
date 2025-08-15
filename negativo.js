const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const tough = require('tough-cookie');
const prompt = require('prompt-sync')();

const alunoJar = new tough.CookieJar();
const alunoClient = wrapper(axios.create({ jar: alunoJar, withCredentials: true }));

async function concluiVideoaula(curso, aula) {
  // Acessa a tela da videoaula
  await alunoClient.get(`http://192.168.0.125/index.php?pag=aluno&secao=aula&curso=${curso}&aula=${aula}`);

  // Envia credenciais do professor para liberar a videoaula
  const resp = await alunoClient.post(
    `http://192.168.0.125/index.php?pag=aluno&secao=aula&curso=${curso}&aula=${aula}`,
    {
      usuario: 'tiago',
      senha: '198569879'
    },
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      transformRequest: [(data) => Object.entries(data)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')]
    }
  );

  // Extrai o token da resposta (se necessário)
  const tokenMatch = resp.data.match(/token=([A-Za-z0-9|=]+)/);
  const token = tokenMatch ? tokenMatch[1] : '';
  console.log('Token extraído:', token);

  // Garante que a tela da videoaula está aberta antes de concluir
  await alunoClient.get(
    `http://192.168.0.125/index.php?pag=aluno&secao=aula&curso=${curso}&aula=${aula}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }
  );

  // Tenta concluir a aula com GET (simula abrir no navegador)
  await alunoClient.get(
    `http://192.168.0.125/index.php?pag=aluno&secao=aula&curso=${curso}&aula=${aula}&concluida=sim&liberado=sim&token=${token}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }
  );

  // Marca a videoaula como concluída e liberada (POST)
  const finalResp = await alunoClient.post(
    `http://192.168.0.125/index.php?pag=aluno&secao=aula&curso=${curso}&aula=${aula}&concluida=sim&liberado=sim&token=${token}`,
    {},
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }
  );
  console.log('Resposta conclusão:', finalResp.data);
  console.log('Videoaula concluída!');
}

async function concluiApostila(curso, aula) {
  const resp = await alunoClient.get(
    `http://192.168.0.125/index.php?pag=aluno&secao=apostila&curso=${curso}&aula=${aula}&concluida=sim`
  );
  console.log('Apostila concluída!');
  console.log(resp.data);
}

async function concluiExercicios(curso, aula) {
  // Acessa exercícios
  const resp1 = await alunoClient.get(
    `http://192.168.0.125/index.php?pag=aluno&secao=exercicios&curso=${curso}&aula=${aula}`
  );
  console.log('Exercícios acessados!');
  // Finaliza exercícios
  const resp2 = await alunoClient.get(
    `http://192.168.0.125/index.php?pag=aluno&secao=curso&secao=exercicios&curso=${curso}&aula=${aula}&tipo=1&concluida=sim`
  );
  console.log('Exercícios finalizados!');
  console.log(resp2.data);
}

async function concluiFixacao(curso, aula) {
  // Acessa fixação
  const resp1 = await alunoClient.get(
    `http://192.168.0.125/index.php?pag=aluno&secao=fixacao&curso=${curso}&aula=${aula}`
  );
  console.log('Fixação acessada!');
  // Conclui fixação
  const resp2 = await alunoClient.get(
    `http://192.168.0.125/index.php?pag=aluno&secao=fixacao&curso=${curso}&aula=${aula}&concluida=sim`
  );
  console.log('Fixação concluída!');
  console.log(resp2.data);
}

async function enviaRespostas() {
  const curso = prompt('Digite o código do curso: ');
  const aula = prompt('Digite o número da aula: ');

  // Login do aluno
  await alunoClient.get('http://192.168.0.125/index.php?pag=login');
  await alunoClient.post('http://192.168.0.125/logar.php?acao=logar', {
    aluno: '0056290',
    senha: '2008'
  }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    transformRequest: [(data) => Object.entries(data)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')]
  });

  // Conclui a videoaula antes da prova
  await concluiVideoaula(curso, aula);

  const proximo1 = prompt('Videoaula concluída! Posso ir para a apostila? (s/n): ');
  if (proximo1.toLowerCase() !== 's') return;

  // Conclui a apostila
  await concluiApostila(curso, aula);

  const proximo2 = prompt('Apostila concluída! Posso ir para os exercícios? (s/n): ');
  if (proximo2.toLowerCase() !== 's') return;

  // Conclui os exercícios
  await concluiExercicios(curso, aula);

  const proximo3 = prompt('Exercícios finalizados! Posso ir para a fixação? (s/n): ');
  if (proximo3.toLowerCase() !== 's') return;

  // Conclui a fixação
  await concluiFixacao(curso, aula);

  const proximo4 = prompt('Fixação concluída! Posso ir para a prova? (s/n): ');
  if (proximo4.toLowerCase() !== 's') return;

  // Envia as respostas da prova
  const respostas = {
    'id[0]': '31287', 'p[0]': '1',
    'id[1]': '31290', 'p[1]': '1',
    'id[2]': '31288', 'p[2]': '1',
    'id[3]': '31289', 'p[3]': '1',
    'id[4]': '31286', 'p[4]': '1',
    'id[5]': '31291', 'p[5]': '1',
    'perguntas': '6',
    'enviado': 'sim'
  };

  const resp = await alunoClient.post(
    `http://192.168.0.125/index.php?pag=aluno&secao=teste&curso=${curso}&aula=${aula}&acao=avalia`,
    respostas,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      transformRequest: [(data) => Object.entries(data)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')]
    }
  );

  console.log('Respostas enviadas!');
  console.log(resp.data);
}

enviaRespostas();