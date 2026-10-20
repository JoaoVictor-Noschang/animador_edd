"use strict";

/**
 * Exemplos de código C pré-carregados.
 * Cada chave é o nome exibido no <select>, e o valor contém:
 *   c  – código-fonte em C
 *   i  – entradas simuladas (campo "Entradas")
 */
const EX = {
  'Laço for com acumulador': {
    c: `int i, soma = 0;
for (i = 1; i <= 5; i++) {
    soma = soma + i;
    printf("%d ", i);
}
printf("\\nSoma = %d\\n", soma);`, i: ''
  },
  'Vetor: soma e maior valor': {
    c: `int v[5], i, soma = 0, maior;
for (i = 0; i < 5; i++) {
    scanf("%d", &v[i]);
}
maior = v[0];
for (i = 0; i < 5; i++) {
    soma += v[i];
    if (v[i] > maior) maior = v[i];
}
printf("Soma: %d  Maior: %d\\n", soma, maior);`, i: '4 9 -3 6 2'
  },
  'Matriz simples: preencher e imprimir': {
    c: `int mat[2][3];
int i, j, cont = 1;
for (i = 0; i < 2; i++) {
    for (j = 0; j < 3; j++) {
        mat[i][j] = cont;
        cont++;
    }
}
for (i = 0; i < 2; i++) {
    for (j = 0; j < 3; j++) {
        printf("%d ", mat[i][j]);
    }
    printf("\\n");
}`, i: ''
  },
  'Matriz simples: ler com scanf e imprimir': {
    c: `int m[2][2], i, j;
for (i = 0; i < 2; i++) {
    for (j = 0; j < 2; j++) {
        scanf("%d", &m[i][j]);
    }
}
for (i = 0; i < 2; i++) {
    for (j = 0; j < 2; j++) {
        printf("m[%d][%d] = %d\\n", i, j, m[i][j]);
    }
}`, i: '7 3 5 9'
  },
  'Matriz 3x3: total e diagonal': {
    c: `int mat[3][3] = {{2, 4, 1}, {3, 5, 7}, {6, 8, 9}};
int i, j, somaTotal = 0, somaDiag = 0;
for (i = 0; i < 3; i++) {
    for (j = 0; j < 3; j++) {
        somaTotal += mat[i][j];
        if (i == j) somaDiag += mat[i][j];
    }
}
printf("Total: %d  Diagonal: %d\\n", somaTotal, somaDiag);`, i: ''
  },
  'String: percorrer e imprimir cada letra': {
    c: `char palavra[] = "Casa";
int i;
for (i = 0; palavra[i] != '\\0'; i++) {
    printf("palavra[%d] = %c\\n", i, palavra[i]);
}
printf("Tamanho: %d\\n", i);`, i: ''
  },
  'String: contar vogais (fgets)': {
    c: `char texto[51];
int i, vogais = 0;
char c;
fgets(texto, 51, stdin);
for (i = 0; texto[i] != '\\0'; i++) {
    c = tolower(texto[i]);
    if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') {
        vogais++;
    }
}
printf("Vogais: %d\\n", vogais);`, i: 'Estrutura de Dados'
  }
};
