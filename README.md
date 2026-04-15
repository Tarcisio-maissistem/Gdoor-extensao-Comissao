# Gweb Tools — Extensão Chrome

Extensão Chrome (Manifest V3) unificada para o **GDOOR Web**, com dois módulos:

- **Comissões** — extração automática de pedidos de venda com cálculo de comissão por data de conclusão
- **DANFE** — geração e impressão de DANFE Cupom (80mm) e DANFE Simplificada (100×150mm)

---

## Módulo Comissões

- Raspagem via API direta — captura tokens de autenticação da sessão ativa
- Pipeline paralelo — até 20 requisições simultâneas
- Cache inteligente — pedidos concluídos/cancelados cacheados por 7 dias (localStorage)
- Persistência de estado — retoma de onde parou em caso de interrupção (chrome.storage.session)
- Filtro por data de conclusão
- Relatório HTML com agrupamento por data e vendedor, detalhamento de itens, resumo com totais e ticket médio
- Exportação CSV (`;`, decimais com `,`, UTF-8 BOM) e texto plano
- Impressão otimizada
- Teste de conexão API integrado

## Módulo DANFE

- Geração de DANFE a partir do XML da NF-e diretamente no visualizador de PDF do Gweb
- **DANFE Cupom** — formato 80mm para impressoras térmicas (fontes engrossadas)
- **DANFE Simplificada** — formato 100×150mm conforme NT 2020.004
- Impressão direta na mesma página (sem pop-up)
- Dados extraídos: emitente, destinatário, produtos, impostos, chave de acesso, protocolo, informações complementares

---

## Instalação

1. Baixe ou clone este repositório
2. Abra o Chrome e acesse `chrome://extensions/`
3. Ative o **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação**
5. Selecione a pasta do projeto

## Uso

### Comissões
1. Faça login no [GDOOR Web](https://app.gdoorweb.com.br)
2. Navegue até a página de **Pedidos de Venda**
3. Clique no ícone da extensão na barra do Chrome
4. Defina o período de datas (data de conclusão)
5. Clique em **Iniciar Raspagem**
6. Ao finalizar, o relatório abre automaticamente

### DANFE
1. Abra qualquer NF-e no GDOOR Web
2. Visualize o PDF da nota
3. Clique em **🧾 DANFE Cupom** ou **📦 DANFE Simplificada**
4. A impressão abre automaticamente

---

## Estrutura do Projeto

```
manifest.json                # Configuração da extensão (MV3)
popup.html / popup.js        # Interface do popup (módulo Comissões)
report.html                  # Página do relatório de comissões
styles.css                   # Estilos auxiliares
src/
  background.js              # Service worker — estado e persistência
  comissao-content.js        # Content script — raspagem e extração de comissões
  comissao-interceptor.js    # MAIN world — captura headers de autenticação
  danfe-content.js           # Content script — geração e impressão de DANFE
  danfe-inject.js            # MAIN world — interceptação de XML e auth
  report.js                  # Gerador do HTML do relatório
  report-page.js             # Lógica interativa da página de relatório
icons/                       # Ícones da extensão (16/48/128px)
```

## Requisitos

- Google Chrome 116+ (Manifest V3, chrome.storage.session)
- Conta ativa no [GDOOR Web](https://app.gdoorweb.com.br)

## Permissões

| Permissão | Uso |
|-----------|-----|
| `activeTab` | Acesso à aba ativa do GDOOR |
| `scripting` | Injeção de scripts nas páginas |
| `downloads` | Exportação de relatórios (CSV) |
| `storage` | Persistência de estado e cache |
| `host_permissions` | Acesso às URLs do GDOOR Web e API |

## Versão

1.0.0
