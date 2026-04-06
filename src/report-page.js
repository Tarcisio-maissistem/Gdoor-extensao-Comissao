/**
 * report-page.js - Logica do relatorio (CSP-compliant)
 * Carrega dados via chrome.storage.local e monta a pagina
 */

(function () {
  'use strict';

  var PREFIX = '[GDOORScraper]';

  var loadingState = document.getElementById('loadingState');
  var emptyState = document.getElementById('emptyState');
  var reportRoot = document.getElementById('reportRoot');

  async function init() {
    console.log(PREFIX, 'Report-page: carregando dados...');

    try {
      var result = await chrome.storage.local.get([
        'reportData',
        'reportDateFrom',
        'reportDateTo',
        'reportGeneratedAt',
        'reportStats',
        'reportAudit',
        'reportDiscarded',
        'reportAlerts'
      ]);

      var data = result.reportData;
      var dateFrom = result.reportDateFrom || '';
      var dateTo = result.reportDateTo || '';
      var generatedAt = result.reportGeneratedAt || new Date().toISOString();
      var stats = result.reportStats || {};
      var audit = result.reportAudit || [];
      var discarded = result.reportDiscarded || [];
      var alerts = result.reportAlerts || [];

      // Limpa os dados do storage apos carregar
      await chrome.storage.local.remove([
        'reportData',
        'reportDateFrom',
        'reportDateTo',
        'reportGeneratedAt',
        'reportStats',
        'reportAudit',
        'reportDiscarded',
        'reportAlerts'
      ]);

      if (!data || data.length === 0) {
        loadingState.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      console.log(PREFIX, 'Report-page: ' + data.length + ' pedidos carregados');

      // Gera o HTML do relatorio usando report.js
      var extras = {
        stats: stats,
        audit: audit,
        discarded: discarded,
        alerts: alerts
      };
      var reportHtml = ReportGenerator.generate(data, dateFrom, dateTo, generatedAt, extras);

      loadingState.style.display = 'none';
      reportRoot.style.display = 'block';
      reportRoot.innerHTML = reportHtml;

      // Conecta eventos apos renderizar
      setupEventListeners(data, dateFrom, dateTo, extras);

    } catch (e) {
      console.error(PREFIX, 'Erro ao carregar relatorio:', e);
      loadingState.innerHTML = '<p style="color:#c73650">Erro ao carregar dados do relat\u00f3rio.</p>';
    }
  }

  function setupEventListeners(data, dateFrom, dateTo, extras) {
    // Botao Copiar Tudo
    var btnCopy = document.getElementById('btnCopyAll');
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        var text = ReportGenerator.generatePlainText(data, extras);
        navigator.clipboard.writeText(text).then(function () {
          btnCopy.textContent = '\u2713 Copiado!';
          setTimeout(function () { btnCopy.textContent = '\ud83d\udccb Copiar Tudo'; }, 2000);
        });
      });
    }

    // Botao Imprimir
    var btnPrint = document.getElementById('btnPrint');
    if (btnPrint) {
      btnPrint.addEventListener('click', function () {
        window.print();
      });
    }

    // Botao CSV
    var btnCsv = document.getElementById('btnCsv');
    if (btnCsv) {
      btnCsv.addEventListener('click', function () {
        var csv = ReportGenerator.generateCSV(data);
        var BOM = '\uFEFF';
        var blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        var fileName = 'pedidos_gdoor_' + dateFrom + '_' + dateTo + '.csv';
        link.download = fileName.replace(/\//g, '-');
        link.click();
        URL.revokeObjectURL(url);
      });
    }

    // Filtro global
    var filterSelect = document.getElementById('filterGlobal');
    if (filterSelect) {
      filterSelect.addEventListener('change', function () {
        var filter = filterSelect.value;
        applyFilter(filter);
      });
    }

    // Botoes expandir itens e pedidos por vendedor
    document.querySelectorAll('.expand-btn').forEach(function (btn) {
      var targetId = btn.dataset.target;
      var target = document.getElementById(targetId);
      if (!target) return;

      // Verifica se e tabela de vendor (tem data-type) ou items-row (tr oculto)
      var isVendorTable = target.dataset.type === 'vendor-orders';

      if (isVendorTable) {
        // Tabela de vendor: visivel por padrao, botao recolhe
        btn.addEventListener('click', function () {
          var hidden = target.style.display === 'none';
          var num = btn.dataset.count || '';
          if (hidden) {
            target.style.display = 'block';
            btn.textContent = '\u25b2 Fechar';
          } else {
            target.style.display = 'none';
            btn.textContent = '\u25bc Pedidos (' + num + ')';
          }
        });
      } else {
        // Items-row de pedido: oculto por padrao, botao expande
        btn.addEventListener('click', function () {
          target.classList.toggle('visible');
          var num = btn.textContent.match(/\d+/)?.[0] || '';
          btn.textContent = target.classList.contains('visible') ? '\u25b2 Fechar' : '\u25bc Itens (' + num + ')';
        });
      }
    });
  }

  function applyFilter(filter) {
    var groups = document.querySelectorAll('.date-group');
    groups.forEach(function (group) {
      if (filter === 'all') {
        group.style.display = 'block';
        return;
      }
      var groupDate = group.dataset.date;
      group.style.display = (groupDate === filter) ? 'block' : 'none';
    });
  }

  init();
})();
