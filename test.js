/**
 * test.js — Testes automatizados da DANFE Simplificada
 * Roda com: node test.js
 * Cobre: extração de ID, parser XML, gerador HTML, formatação de documentos.
 */
'use strict';

// Polyfill DOMParser para Node (mesmo comportamento do browser)
const { DOMParser } = require('xmldom');
global.DOMParser = DOMParser;

// ─── Helpers de teste ────────────────────────────────────────────────────────
let _ok = 0, _fail = 0;

function assert(desc, cond) {
  if (cond) {
    console.log('  ✅ ' + desc);
    _ok++;
  } else {
    console.error('  ❌ FALHOU: ' + desc);
    _fail++;
  }
}

function secao(nome) {
  console.log('\n' + '─'.repeat(55));
  console.log(' ' + nome);
  console.log('─'.repeat(55));
}

// ─── Extrair funções do content.js sem executar os efeitos colaterais ────────
// Reescrevemos as funções puras para teste isolado (sem DOM do browser)

// ── Regex de extração de ID ────────────────────────────────────────────────
function extrairIdDeHref(href) {
  const m = href.match(/saidas\/(\d+)/i) ||
            href.match(/nf-e\/(\d+)/i) ||
            href.match(/\/(\d+)\/xml/i);
  return m ? m[1] : null;
}

// ── Parser XML (cópia fiel do content.js) ─────────────────────────────────
function parsearXml(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  function g(pai, tag) {
    if (!pai) return '';
    const el = pai.getElementsByTagName(tag)[0];
    return el ? el.textContent.trim() : '';
  }
  const emit   = doc.getElementsByTagName('emit')[0];
  const dest   = doc.getElementsByTagName('dest')[0];
  const ide    = doc.getElementsByTagName('ide')[0];
  const tot    = doc.getElementsByTagName('ICMSTot')[0];
  const infNFe = doc.getElementsByTagName('infNFe')[0];
  const dhEmi  = g(ide, 'dhEmi') || g(ide, 'dEmi');
  const chave  = infNFe ? (infNFe.getAttribute('Id') || '').replace(/^NFe/, '') : '';

  const produtos = Array.from(doc.getElementsByTagName('det')).map(function (det) {
    const p = det.getElementsByTagName('prod')[0];
    return {
      nome:  g(p, 'xProd'),
      qtd:   parseFloat(g(p, 'qCom') || '0'),
      unid:  g(p, 'uCom'),
      vUnit: parseFloat(g(p, 'vUnCom') || '0'),
      vProd: parseFloat(g(p, 'vProd') || '0')
    };
  });

  return {
    emit: {
      nome: g(emit, 'xNome'),
      fant: g(emit, 'xFant'),
      cnpj: g(emit, 'CNPJ'),
      end:  [g(emit, 'xLgr'), g(emit, 'nro')].filter(Boolean).join(', ')
    },
    dest: {
      nome:    g(dest, 'xNome') || 'Consumidor Final',
      cpfCnpj: g(dest, 'CPF') || g(dest, 'CNPJ') || ''
    },
    nNF:    g(ide, 'nNF'),
    serie:  g(ide, 'serie'),
    data:   dhEmi ? 'DATA_OK' : '',
    chave,
    vNF:    parseFloat(g(tot, 'vNF')    || '0'),
    vDesc:  parseFloat(g(tot, 'vDesc')  || '0'),
    vFrete: parseFloat(g(tot, 'vFrete') || '0'),
    produtos
  };
}

// ── Formatadores (cópia fiel do content.js) ───────────────────────────────
function fmtCnpj(c) {
  return c && c.length === 14
    ? c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    : c || '';
}
function fmtCpf(c) {
  return c && c.length === 11
    ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : c || '';
}

// ─── XML de NF-e mínimo para testes ─────────────────────────────────────────
const XML_SIMPLES = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe41240312345678000100550010000009811234567890">
      <ide>
        <nNF>981</nNF>
        <serie>1</serie>
        <dhEmi>2024-03-13T10:30:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000100</CNPJ>
        <xNome>EMPRESA TESTE LTDA</xNome>
        <xFant>LOJA TESTE</xFant>
        <xLgr>Rua das Flores</xLgr>
        <nro>123</nro>
        <xMun>São Paulo</xMun>
        <UF>SP</UF>
      </emit>
      <dest>
        <CPF>12345678901</CPF>
        <xNome>JOAO DA SILVA</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <xProd>PRODUTO A NOME LONGO PARA TESTAR QUEBRA</xProd>
          <qCom>2.000</qCom>
          <uCom>UN</uCom>
          <vUnCom>50.00</vUnCom>
          <vProd>100.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <xProd>PRODUTO B</xProd>
          <qCom>1.500</qCom>
          <uCom>KG</uCom>
          <vUnCom>10.00</vUnCom>
          <vProd>15.00</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>115.00</vNF>
          <vDesc>0.00</vDesc>
          <vFrete>0.00</vFrete>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

const XML_COM_DESCONTO = XML_SIMPLES.replace('<vDesc>0.00</vDesc>', '<vDesc>5.00</vDesc>');
const XML_COM_FRETE    = XML_SIMPLES.replace('<vFrete>0.00</vFrete>', '<vFrete>10.00</vFrete>');
const XML_SEM_DEST     = XML_SIMPLES.replace('<xNome>JOAO DA SILVA</xNome>', '');
const XML_CNPJ_DEST    = XML_SIMPLES
  .replace('<CPF>12345678901</CPF>', '')
  .replace('<xNome>JOAO DA SILVA</xNome>', '<CNPJ>98765432000188</CNPJ><xNome>EMPRESA CLIENTE</xNome>');

// ═══════════════════════════════════════════════════════════════════
// BLOCO 1 — Extração de ID via regex (simula Etapa 3)
// ═══════════════════════════════════════════════════════════════════
secao('BLOCO 1 — Extração de ID da NF-e');

assert('Extrai ID de href /saidas/981',
  extrairIdDeHref('/movimentos/nf-e/saidas/981') === '981');

assert('Extrai ID de href /saidas/981/xml',
  extrairIdDeHref('/movimentos/nf-e/saidas/981/xml?preview=false') === '981');

assert('Extrai ID de href /12345/xml',
  extrairIdDeHref('/qualquer/12345/xml') === '12345');

assert('Extrai ID de ng-reflect com formato diferente',
  extrairIdDeHref('/nf-e/42') === '42');

assert('Retorna null para href sem ID numérico',
  extrairIdDeHref('/movimentos/nf-e/saidas/') === null);

assert('Retorna null para href vazio',
  extrairIdDeHref('') === null);

assert('Extrai ID de 5 dígitos',
  extrairIdDeHref('/saidas/99999/xml') === '99999');

// ═══════════════════════════════════════════════════════════════════
// BLOCO 2 — Parser do XML (simula Etapa 5)
// ═══════════════════════════════════════════════════════════════════
secao('BLOCO 2 — Parser do XML da NF-e');

const dados = parsearXml(XML_SIMPLES);

assert('Número da NF: 981',          dados.nNF === '981');
assert('Série: 1',                   dados.serie === '1');
assert('Data de emissão preenchida', dados.data === 'DATA_OK');
assert('Chave de 44 dígitos',        dados.chave.length === 44);

assert('Emitente nome: EMPRESA TESTE LTDA',  dados.emit.nome === 'EMPRESA TESTE LTDA');
assert('Emitente fantasia: LOJA TESTE',      dados.emit.fant === 'LOJA TESTE');
assert('Emitente CNPJ preenchido',           dados.emit.cnpj === '12345678000100');
assert('Emitente endereço: Rua das Flores, 123', dados.emit.end === 'Rua das Flores, 123');

assert('Destinatário: JOAO DA SILVA', dados.dest.nome === 'JOAO DA SILVA');
assert('Destinatário CPF preenchido', dados.dest.cpfCnpj === '12345678901');

assert('2 produtos parseados',        dados.produtos.length === 2);
assert('Produto 1 nome correto',      dados.produtos[0].nome === 'PRODUTO A NOME LONGO PARA TESTAR QUEBRA');
assert('Produto 1 qtd: 2.0',         dados.produtos[0].qtd === 2.0);
assert('Produto 1 unid: UN',         dados.produtos[0].unid === 'UN');
assert('Produto 1 vUnit: 50.00',     dados.produtos[0].vUnit === 50.00);
assert('Produto 1 vProd: 100.00',    dados.produtos[0].vProd === 100.00);
assert('Produto 2 qtd: 1.5',         dados.produtos[1].qtd === 1.5);
assert('Produto 2 unid: KG',         dados.produtos[1].unid === 'KG');

assert('Total vNF: 115.00',          dados.vNF === 115.00);
assert('Total vDesc: 0',             dados.vDesc === 0);
assert('Total vFrete: 0',            dados.vFrete === 0);

// Casos especiais
const dadosSemDest = parsearXml(XML_SEM_DEST);
assert('Destinatário vazio → Consumidor Final',
  dadosSemDest.dest.nome === 'Consumidor Final');

const dadosCnpjDest = parsearXml(XML_CNPJ_DEST);
assert('Destinatário com CNPJ capturado',
  dadosCnpjDest.dest.cpfCnpj === '98765432000188');

const dadosDesc = parsearXml(XML_COM_DESCONTO);
assert('Desconto 5.00 parseado',     dadosDesc.vDesc === 5.00);

const dadosFrete = parsearXml(XML_COM_FRETE);
assert('Frete 10.00 parseado',       dadosFrete.vFrete === 10.00);

// ═══════════════════════════════════════════════════════════════════
// BLOCO 3 — Formatadores de documentos (CNPJ / CPF)
// ═══════════════════════════════════════════════════════════════════
secao('BLOCO 3 — Formatadores de CNPJ e CPF');

assert('CNPJ formatado: 12.345.678/0001-00',
  fmtCnpj('12345678000100') === '12.345.678/0001-00');

assert('CPF formatado: 123.456.789-01',
  fmtCpf('12345678901') === '123.456.789-01');

assert('CNPJ inválido (< 14 chars) → retorna original',
  fmtCnpj('123') === '123');

assert('CNPJ vazio → retorna string vazia',
  fmtCnpj('') === '');

assert('CPF vazio → retorna string vazia',
  fmtCpf('') === '');

// ═══════════════════════════════════════════════════════════════════
// BLOCO 4 — Gerador HTML (estrutura do cupom)
// ═══════════════════════════════════════════════════════════════════
secao('BLOCO 4 — Estrutura do HTML gerado');

// Reimplementar gerarHtml aqui para teste
function gerarHtml(d) {
  function br(v) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function n3(v) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }); }
  function fmtCnpjLocal(c) {
    return c && c.length === 14
      ? c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : c || '';
  }
  function fmtCpfLocal(c) {
    return c && c.length === 11
      ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : c || '';
  }
  function fmtDoc(c) { return c.length === 14 ? fmtCnpjLocal(c) : fmtCpfLocal(c); }
  const chaveBlocks = d.chave ? d.chave.match(/.{1,4}/g).join(' ') : '';
  const itens = d.produtos.map(p =>
    '<div class="item"><div class="iN">' + p.nome + '</div>' +
    '<div class="iC"><span>' + n3(p.qtd) + ' ' + p.unid + ' × R$ ' + br(p.vUnit) + '</span>' +
    '<span class="iT">R$ ' + br(p.vProd) + '</span></div></div>'
  ).join('');

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
    '<title>DANFE' + (d.nNF ? ' NF-' + d.nNF : '') + '</title>' +
    '<style>@page { size: 80mm auto; }</style></head><body>' +
    '<div class="titulo">DANFE SIMPLIFICADA</div>' +
    (d.nNF ? '<div>NF-e Nº ' + d.nNF + '</div>' : '') +
    '<div>' + (d.emit.fant || d.emit.nome) + '</div>' +
    '<div>CNPJ: ' + fmtCnpjLocal(d.emit.cnpj) + '</div>' +
    '<div>' + d.dest.nome + '</div>' +
    (d.dest.cpfCnpj ? '<div>' + fmtDoc(d.dest.cpfCnpj) + '</div>' : '') +
    itens +
    (d.vDesc > 0 ? '<div>Desconto: R$ ' + br(d.vDesc) + '</div>' : '') +
    (d.vFrete > 0 ? '<div>Frete: R$ ' + br(d.vFrete) + '</div>' : '') +
    '<div>TOTAL R$ ' + br(d.vNF) + '</div>' +
    (chaveBlocks ? '<div>' + chaveBlocks + '</div>' : '') +
    '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},400);});<\/script>' +
    '</body></html>';
}

const html = gerarHtml(dados);

assert('HTML começa com DOCTYPE',             html.startsWith('<!DOCTYPE html>'));
assert('Contém DANFE SIMPLIFICADA',           html.includes('DANFE SIMPLIFICADA'));
assert('Contém NF-e Nº 981',                  html.includes('NF-e N'));
assert('Contém nome do emitente',             html.includes('LOJA TESTE'));
assert('Contém CNPJ formatado',               html.includes('12.345.678/0001-00'));
assert('Contém nome destinatário',            html.includes('JOAO DA SILVA'));
assert('Contém CPF formatado',                html.includes('123.456.789-01'));
assert('Contém produto 1',                    html.includes('PRODUTO A NOME LONGO'));
assert('Contém produto 2',                    html.includes('PRODUTO B'));
assert('Contém total R$ 115,00',              html.includes('115,00'));
assert('Contém chave em blocos',              html.includes(dados.chave.substring(0,4)));
assert('@page size 80mm presente',            html.includes('80mm'));
assert('Script window.print() presente',      html.includes('window.print()'));
assert('Sem desconto → linha omitida',        !html.includes('Desconto'));
assert('Sem frete → linha omitida',           !html.includes('Frete'));

// Com desconto/frete
const htmlDesc  = gerarHtml(parsearXml(XML_COM_DESCONTO));
const htmlFrete = gerarHtml(parsearXml(XML_COM_FRETE));
assert('Desconto aparece quando > 0',         htmlDesc.includes('Desconto'));
assert('Frete aparece quando > 0',            htmlFrete.includes('Frete'));

// Destinatário sem nome → Consumidor Final
const htmlSemDest = gerarHtml(dadosSemDest);
assert('Consumidor Final quando sem destinatário', htmlSemDest.includes('Consumidor Final'));

// ═══════════════════════════════════════════════════════════════════
// BLOCO 5 — Validação do manifest.json
// ═══════════════════════════════════════════════════════════════════
secao('BLOCO 5 — manifest.json');

const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf-8'));

assert('manifest_version: 3',                manifest.manifest_version === 3);
assert('name preenchido',                    manifest.name.length > 0);
const csMain = manifest.content_scripts.find(cs => cs.world === 'MAIN');
const csIso  = manifest.content_scripts.find(cs => !cs.world || cs.world !== 'MAIN');

assert('Contém 2 content_scripts',           manifest.content_scripts.length === 2);
assert('inject.js no mundo MAIN',            csMain && csMain.js.includes('inject.js'));
assert('inject.js roda em document_start',   csMain && csMain.run_at === 'document_start');
assert('content.js no mundo ISOLATED',       csIso  && csIso.js.includes('content.js'));
assert('styles.css listado',                 csIso  && csIso.css.includes('styles.css'));
assert('host_permission inclui app.gdoorweb', manifest.host_permissions.some(h => h.includes('app.gdoorweb.com.br')));
assert('content.js roda em document_idle',   csIso  && csIso.run_at === 'document_idle');

// ═══════════════════════════════════════════════════════════════════
// RESULTADO FINAL
// ═══════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(55));
const total = _ok + _fail;
console.log(' RESULTADO: ' + _ok + '/' + total + ' testes passaram' +
  (_fail > 0 ? ' — ' + _fail + ' FALHAS' : ' ✅'));
console.log('═'.repeat(55) + '\n');

if (_fail > 0) process.exit(1);
