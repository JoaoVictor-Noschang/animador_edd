# Animador de Laços e Matrizes em C

Uma ferramenta visual e interativa para o ensino e aprendizagem de algoritmos e estruturas de dados em Linguagem C.

O projeto permite selecionar exemplos práticos e acompanhar a execução passo a passo, visualizando:
- A linha de código em execução no momento.
- As mensagens explicativas sobre cada instrução e teste lógico.
- O estado e as mudanças das variáveis em tempo real na **Memória** (escalares, vetores, matrizes e strings).
- A **Saída do programa** (`printf`).
- O **Teste de mesa** sendo preenchido automaticamente linha por linha.

---

## 🚀 Como Utilizar

Não é necessário instalar nada nem rodar servidores ou dependências (Node/npm):

1. Dê um duplo clique no arquivo **`index.html`** (ou abra-o em qualquer navegador como Chrome, Edge ou Firefox).
2. No topo da página, escolha um dos exemplos pré-definidos no menu suspenso (**Exemplo**).
3. Utilize os botões de controle:
   - **`▶ Reproduzir` / `⏸ Pausar`**: inicia ou pausa a execução automática do código.
   - **`Próximo ›`**: avança uma única instrução/passo.
   - **`‹ Anterior`**: retrocede um passo para revisar o estado anterior.
   - **`⏮ Início`**: reinicia a simulação para o primeiro passo.
   - **Velocidade**: ajuste a barra deslizante para controlar a velocidade da reprodução automática.
4. Para exemplos que utilizam `scanf` ou `fgets`, o campo de **Entradas** permite visualizar e até editar os valores simulados do teclado (a simulação recarrega automaticamente ao alterar o valor).

---

## 📂 Estrutura de Arquivos

```text
site_exemplos_teste/
│
├── index.html           # Estrutura principal da página web
├── styles.css           # Estilos visuais (cores, temas claro/escuro, layout)
├── examples.js          # Exemplos de código C e entradas pré-definidas
├── scripts.js           # Analisador léxico/sintático, interpretador C e lógica da interface
└── README.md            # Documentação e instruções de uso
```

---

## 📚 Exemplos Disponíveis

1. **Laço for com acumulador**: laço simples acumulando soma de 1 a 5.
2. **Vetor: soma e maior valor**: leitura de vetor com `scanf`, cálculo da soma e busca do maior valor.
3. **Matriz simples: preencher e imprimir**: laços aninhados preenchendo uma matriz 2x3.
4. **Matriz simples: ler com scanf e imprimir**: leitura e impressão dos elementos de uma matriz 2x2.
5. **Matriz 3x3: total e diagonal**: soma total dos elementos e soma apenas da diagonal principal (`i == j`).
6. **String: percorrer e imprimir cada letra**: manipulação de `char[]` iterando até o terminador `'\0'`.
7. **String: contar vogais (fgets)**: leitura com `fgets`, conversão com `tolower` e contagem de caracteres.
