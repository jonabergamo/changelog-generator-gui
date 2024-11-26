# 📝 Changelog Generator GUI

Uma aplicação Electron construída com React e TypeScript para gerar changelogs a partir de projetos Git selecionados, utilizando a biblioteca [`github-changelog-generator`](https://github.com/github-changelog-generator/github-changelog-generator). Adere aos princípios do Versionamento Semântico, permitindo configurar versões *major*, *minor* e *patch* para seus changelogs.

## 📚 Sumário

- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura do Projeto](#-arquitetura-do-projeto)
- [Requisitos Mínimos do Sistema](#-requisitos-mínimos-do-sistema)
- [Como Executar o Projeto](#-como-executar-o-projeto)
- [Descrição dos Serviços](#-descrição-dos-serviços)
- [Como Utilizar a Aplicação](#-como-utilizar-a-aplicação)
- [Observações](#-observações)
- [Licença](#-licença)
- [Contribuindo](#-contribuindo)
- [Agradecimentos](#-agradecimentos)

## 🛠 Tecnologias Utilizadas

- **Linguagens:** TypeScript, JavaScript
- **Frameworks e Bibliotecas:**
  - Electron
  - React
  - Node.js
  - [`github-changelog-generator`](https://github.com/github-changelog-generator/github-changelog-generator)
  - `standard-version` para versionamento
- **Ferramentas de Build:** Webpack, Babel
- **Linters e Formatadores:** ESLint, Prettier
- **Controle de Versão:** Git
- **Gerenciador de Pacotes:** npm

## 🏗 Arquitetura do Projeto

A aplicação segue uma arquitetura modular, separando as responsabilidades entre o processo principal (*main*) e o processo de renderização (*renderer*) no Electron. Utiliza React para construir a interface do usuário e TypeScript para garantir a segurança de tipos e clareza do código.

- **Processo Principal (Main):** Gerencia o ciclo de vida da aplicação Electron, operações do sistema de arquivos e comunicação entre processos.
- **Processo de Renderização (Renderer):** Lida com a interface do usuário, construída com React, e comunica-se com o processo principal via IPC.
- **Geração de Changelog:** Utiliza a biblioteca [`github-changelog-generator`](https://github.com/github-changelog-generator/github-changelog-generator) para analisar o histórico de commits do Git e gerar changelogs seguindo o Versionamento Semântico.

## 💻 Requisitos Mínimos do Sistema

- **Node.js:** Versão 16.x ou superior
- **npm:** Versão 7.x ou superior
- **Sistema Operacional:** Windows, macOS ou Linux (compatível com Electron)
- **Memória RAM:** 4 GB
- **Armazenamento:** 500 MB de espaço livre em disco

## 🚀 Como Executar o Projeto

### Clonar o Repositório

```bash
git clone https://github.com/jonabergamo/changelog-generator-gui.git
cd changelog-generator-gui
```

## Instalar as Dependências
Certifique-se de ter o Node.js e o npm instalados. Em seguida, instale as dependências do projeto:
```bash
npm install
```
## Modo de Desenvolvimento
```bash
npm run dev
```
## Build para Produção
```bash
# Para Windows
npm run build:win

# Para macOS
npm run build:mac

# Para Linux
npm run build:linux
```
## 📜 Descrição dos Serviços

### Geração de Changelog

A aplicação permite que você selecione um projeto Git e gere um changelog baseado no histórico de commits, utilizando a biblioteca [`github-changelog-generator`](https://github.com/github-changelog-generator/github-changelog-generator). Ela segue os princípios do Versionamento Semântico, permitindo a configuração de versões *major*, *minor* e *patch*.

#### Funcionalidades:
- Seleção de repositórios Git locais
- Configuração de opções de versionamento
- Geração de changelogs em formato Markdown
- Pré-visualização de changelogs antes de salvar
- Salvamento de changelogs em arquivo

### Interface do Usuário

- Construída com React e TypeScript
- Utiliza componentes modernos de UI e estilização
- Interface responsiva e amigável ao usuário

## 🌐 Como Utilizar a Aplicação

### Abrir a Aplicação:

1. Inicie a aplicação usando `npm run dev` ou executando o arquivo construído.

### Selecionar um Projeto Git:

2. Use o explorador de arquivos para navegar e selecionar a pasta raiz do seu projeto Git.

### Configurar o Versionamento:

3. Escolha o tipo de versão (*major*, *minor*, *patch*) de acordo com as mudanças no seu projeto.

### Gerar Changelog:

4. Clique no botão "Gerar" para criar o changelog baseado no histórico de commits.

### Pré-visualizar e Salvar:

5. Revise o changelog gerado na janela de pré-visualização. Salve-o no local desejado.

## 🔧 Observações

- **Repositório Git Necessário:** Certifique-se de que o projeto selecionado é um repositório Git válido com histórico de commits.
- **Mensagens de Commit Semânticas:** Para melhores resultados, utilize mensagens de commit convencionais seguindo as diretrizes do Angular ou similares.
- **Versões do Node e Pacotes:** As versões dos pacotes e do Node.js utilizados estão especificadas no `package.json`.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests para correções de bugs e novas funcionalidades.

### Configuração Recomendada do IDE

- [Visual Studio Code](https://code.visualstudio.com/) com as seguintes extensões:
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## 🙏 Agradecimentos

- Agradecimentos aos contribuidores da biblioteca [`github-changelog-generator`](https://github.com/github-changelog-generator/github-changelog-generator).
- Inspirado nas melhores práticas de desenvolvimento com Electron e React.

---

**Obrigado por utilizar o Changelog Generator GUI!**


