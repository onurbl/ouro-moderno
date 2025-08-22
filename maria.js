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

  // Marca a videoaula como concluída e liberada
  const finalResp = await alunoClient.post(
    `http://192.168.0.125/index.php?pag=aluno&secao=aula&curso=${curso}&aula=${aula}&concluida=sim&liberado=sim&token=${token}`,
    {},
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
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

async function liberaProva(curso, aula) {
  // Libera a prova usando o endpoint correto
  const resp = await alunoClient.post(
    `http://192.168.0.125/index.php?pag=aluno&secao=liberaaula&curso=${curso}&aula=${aula}`,
    {
      liberaaula_login: 'tiago',
      liberaaula_senha: '198569879'
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `http://192.168.0.125/index.php?pag=aluno&secao=liberaaula&curso=${curso}&aula=${aula}`
      },
      transformRequest: [(data) => Object.entries(data)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')]
    }
  );
  console.log('Resposta liberação prova:', resp.data);
}

async function liberaProvaComProfessor(curso, aula) {
  console.log(`[INFO] Acessando tela da prova: curso=${curso}, aula=${aula}`);
  const telaProva = await alunoClient.get(`http://192.168.0.125/index.php?pag=aluno&secao=teste&curso=${curso}&aula=${aula}`);
  console.log(`[DEBUG] Status tela prova: ${telaProva.status}`);

  console.log(`[INFO] Enviando credenciais do professor para liberar prova...`);
  const resp = await alunoClient.post(
    'http://192.168.0.125/_pags/aluno/ajax_verifica_teste_liberado.php',
    {
      curso: curso,
      aula: aula,
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
  console.log(`[DEBUG] Status liberação prova: ${resp.status}`);
  console.log(`[DEBUG] Corpo resposta liberação prova: ${resp.data}`);
  if (resp.data !== '1') {
    console.log('[ERRO] A prova NÃO foi liberada! Verifique usuário/senha do professor ou tente novamente.');
  } else {
    console.log('[SUCESSO] Prova liberada pelo professor!');
  }
}

async function liberaProvaCompleta(curso, aula) {
  // 1. POST ajax_verifica_teste_liberado.php (JSON)
  await alunoClient.post(
    'http://192.168.0.125/_pags/aluno/ajax_verifica_teste_liberado.php',
    { curso: curso, aula: aula },
    {
      headers: {
        'Content-Type': 'application/json',
        'Referer': `http://192.168.0.125/index.php?pag=aluno&secao=liberaaula&curso=${curso}&aula=${aula}`
      }
    }
  );

  // 2. POST liberação do professor
  await alunoClient.post(
    `http://192.168.0.125/index.php?pag=aluno&secao=liberaaula&curso=${curso}&aula=${aula}`,
    {
      liberaaula_login: 'tiago',
      liberaaula_senha: '198569879'
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `http://192.168.0.125/index.php?pag=aluno&secao=liberaaula&curso=${curso}&aula=${aula}`
      },
      transformRequest: [(data) => Object.entries(data)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')]
    }
  );

  // 3. POST salvar observação/apostila/fixação
  await alunoClient.post(
    `http://192.168.0.125/index.php?pag=aluno&secao=liberaaula&curso=${curso}&aula=${aula}&acao=salvar`,
    {
      observacao: '',
      apostila: 's',
      fixacao: 's'
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `http://192.168.0.125/index.php?pag=aluno&secao=liberaaula&curso=${curso}&aula=${aula}`
      },
      transformRequest: [(data) => Object.entries(data)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')]
    }
  );

  // 4. POST ajax_verifica_teste_liberado.php (JSON) novamente
  await alunoClient.post(
    'http://192.168.0.125/_pags/aluno/ajax_verifica_teste_liberado.php',
    { curso: curso, aula: aula },
    {
      headers: {
        'Content-Type': 'application/json',
        'Referer': `http://192.168.0.125/index.php?pag=aluno&secao=liberaaula&curso=${curso}&aula=${aula}`
      }
    }
  );
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

  // Libera a prova com todas as etapas antes de enviar respostas
  await liberaProvaCompleta(curso, aula);

  // Defina as respostas da prova aqui!
  const respostas = {
    'id[0]': '50634', 'p[0]': '1',
    'id[1]': '50636', 'p[1]': '1',
    'id[2]': '50635', 'p[2]': '1',
    'id[3]': '50633', 'p[3]': '1',
    'id[4]': '50637', 'p[4]': '1',
    'perguntas': '5',
    'enviado': 'sim'
  };

  // Envia as respostas da prova
  console.log('[INFO] Enviando respostas da prova...');
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

  console.log(`[DEBUG] Status envio respostas: ${resp.status}`);
  if (resp.headers['content-type'] && resp.headers['content-type'].includes('text/html')) {
    console.log('[ATENÇÃO] Recebeu HTML como resposta, pode ser erro ou redirecionamento.');
    console.log(resp.data.substring(0, 500)); // Mostra só o início do HTML
  } else {
    console.log('[SUCESSO] Respostas enviadas!');
    console.log(resp.data);
  }
}

enviaRespostas();