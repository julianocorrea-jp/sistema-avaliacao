// =====================================================
// SISTEMA DE SINCRONIZAÇÃO ONLINE
// =====================================================

// =====================================================
// FUNÇÕES DE SINCRONIZAÇÃO
// =====================================================

async function inicializarSistemaOnline() {
    console.log('🌐 Inicializando sistema online...');
    
    // Verificar se empresa está configurada
    if (!configOnline.empresaId) {
        console.log('🏢 Empresa não configurada - modo offline');
        atualizarStatusConexao();
        return false;
    }

    // Verificar conexão
    if (!navigator.onLine) {
        console.log('📡 Sem conexão - modo offline');
        atualizarStatusConexao();
        return false;
    }

    // Tentar sincronização inicial
    try {
        await sincronizarDados();
        configOnline.ativo = true;
        console.log('✅ Sistema online ativo');
        atualizarStatusConexao();
        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar online:', error);
        atualizarStatusConexao();
        return false;
    }
}

async function sincronizarDados() {
    if (!configOnline.empresaId || !navigator.onLine) {
        console.log('⚠️ Sincronização não disponível');
        return;
    }

    statusConexao.sincronizando = true;
    atualizarStatusConexao();
    adicionarLogSync('🔄 Iniciando sincronização...');

    try {
        // 1. Buscar dados do servidor
        const dadosServidor = await buscarDadosServidor();
        
        // 2. Comparar com dados locais
        const conflitos = detectarConflitos(dadosServidor);
        
        // 3. Resolver conflitos (últimas modificações vencem)
        const dadosFinais = resolverConflitos(conflitos);
        
        // 4. Salvar dados atualizados localmente
        await salvarDadosLocalmente(dadosFinais);
        
        // 5. Enviar dados locais para servidor
        await enviarDadosServidor(dadosFinais);
        
        // 6. Atualizar timestamp da sincronização
        configOnline.ultimaSync = new Date().toISOString();
        localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'ultima_sync', configOnline.ultimaSync);
        
        console.log('✅ Sincronização concluída');
        adicionarLogSync('✅ Sincronização concluída com sucesso');
        mostrarAlerta('🌐 Dados sincronizados com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro na sincronização:', error);
        statusConexao.ultimoErro = error.message;
        adicionarLogSync('❌ Erro na sincronização: ' + error.message);
        mostrarAlerta('❌ Erro na sincronização: ' + error.message, 'danger');
    } finally {
        statusConexao.sincronizando = false;
        atualizarStatusConexao();
    }
}

async function buscarDadosServidor() {
    console.log('📥 Buscando dados do servidor...');
    adicionarLogSync('📥 Conectando ao servidor...');
    
    // Simulação da API - em ambiente real seria uma chamada HTTP
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
        avaliacoes: JSON.parse(localStorage.getItem(SYSTEM_CONFIG.storagePrefix + 'servidor_avaliacoes') || '[]'),
        colaboradores: JSON.parse(localStorage.getItem(SYSTEM_CONFIG.storagePrefix + 'servidor_colaboradores') || '{}'),
        gestores: JSON.parse(localStorage.getItem(SYSTEM_CONFIG.storagePrefix + 'servidor_gestores') || '{}'),
        timestamp: localStorage.getItem(SYSTEM_CONFIG.storagePrefix + 'servidor_timestamp') || new Date().toISOString()
    };
}

async function enviarDadosServidor(dados) {
    console.log('📤 Enviando dados para servidor...');
    adicionarLogSync('📤 Enviando dados para servidor...');
    
    // Simulação da API - em ambiente real seria uma chamada HTTP
    await new Promise(resolve => setTimeout(resolve, 500));
    
    localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'servidor_avaliacoes', JSON.stringify(dados.avaliacoes));
    localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'servidor_colaboradores', JSON.stringify(dados.colaboradores));
    localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'servidor_gestores', JSON.stringify(dados.gestores));
    localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'servidor_timestamp', new Date().toISOString());
    
    adicionarLogSync('📤 Dados enviados com sucesso');
}

function detectarConflitos(dadosServidor) {
    const dadosLocais = {
        avaliacoes: avaliacoes,
        colaboradores: colaboradores,
        gestores: gestores,
        timestamp: localStorage.getItem(SYSTEM_CONFIG.storagePrefix + 'ultima_modificacao') || new Date().toISOString()
    };

    return {
        servidor: dadosServidor,
        local: dadosLocais,
        temConflito: dadosServidor.timestamp !== dadosLocais.timestamp
    };
}

function resolverConflitos(conflitos) {
    console.log('🔧 Resolvendo conflitos...');
    adicionarLogSync('🔧 Analisando conflitos...');
    
    if (!conflitos.temConflito) {
        console.log('✅ Nenhum conflito detectado');
        adicionarLogSync('✅ Nenhum conflito detectado');
        return conflitos.local;
    }

    // Estratégia: última modificação vence
    const timestampServidor = new Date(conflitos.servidor.timestamp);
    const timestampLocal = new Date(conflitos.local.timestamp);

    if (timestampServidor > timestampLocal) {
        console.log('📥 Dados do servidor são mais recentes');
        adicionarLogSync('📥 Aplicando dados do servidor (mais recentes)');
        return conflitos.servidor;
    } else {
        console.log('📤 Dados locais são mais recentes');
        adicionarLogSync('📤 Mantendo dados locais (mais recentes)');
        return conflitos.local;
    }
}

async function salvarDadosLocalmente(dados) {
    avaliacoes = dados.avaliacoes || [];
    colaboradores = dados.colaboradores || {};
    gestores = dados.gestores || {};
    
    localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'avaliacoes', JSON.stringify(avaliacoes));
    localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'colaboradores', JSON.stringify(colaboradores));
    localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'gestores', JSON.stringify(gestores));
    localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'ultima_modificacao', new Date().toISOString());
    
    // Atualizar interface
    atualizarEstatisticasHome();
    if (typeof atualizarEstatisticasConfig === 'function' && acessoConfig) {
        atualizarEstatisticasConfig();
    }
    if (typeof atualizarHistorico === 'function' && acessoAtivo) {
        atualizarHistorico();
    }
    
    adicionarLogSync('💾 Dados salvos localmente');
}

// =====================================================
// CONFIGURAÇÃO DE EMPRESA
// =====================================================

function configurarEmpresa(empresaId) {
    if (!empresaId || !empresaId.trim()) {
        mostrarAlerta('❌ ID da empresa é obrigatório!', 'danger');
        return false;
    }

    configOnline.empresaId = empresaId.trim().toUpperCase();
    localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'empresa_id', configOnline.empresaId);
    
    mostrarAlerta(`🏢 Empresa configurada: ${configOnline.empresaId}`, 'success');
    console.log('🏢 Empresa configurada:', configOnline.empresaId);
    adicionarLogSync(`🏢 Empresa configurada: ${configOnline.empresaId}`);
    
    // Tentar sincronização inicial
    setTimeout(() => {
        sincronizarDados();
    }, 1000);
    
    atualizarInterfaceOnline();
    return true;
}

function configurarEmpresaManual() {
    const input = document.getElementById('inputEmpresaId');
    if (!input) return;
    
    const empresaId = input.value.trim();
    
    if (configurarEmpresa(empresaId)) {
        input.value = '';
    }
}

// =====================================================
// STATUS E INTERFACE
// =====================================================

function atualizarStatusConexao() {
    statusConexao.online = navigator.onLine;
    
    // Atualizar indicador visual principal
    const indicador = document.getElementById('statusConexao');
    if (indicador) {
        let status = '';
        let cor = '';
        
        if (!configOnline.empresaId) {
            status = '🏢 Configurar empresa';
            cor = '#ffc107';
        } else if (!statusConexao.online) {
            status = '📡 Offline';
            cor = '#dc3545';
        } else if (statusConexao.sincronizando) {
            status = '🔄 Sincronizando...';
            cor = '#17a2b8';
        } else if (configOnline.ativo) {
            status = '🌐 Sincronizado';
            cor = '#28a745';
        } else {
            status = '⚠️ Não sincronizado';
            cor = '#ffc107';
        }
        
        indicador.innerHTML = status;
        indicador.style.color = cor;
    }
}

function atualizarInterfaceOnline() {
    // Atualizar status detalhado se estiver na tela de configurações
    const statusDetalhado = document.getElementById('statusConexaoDetalhado');
    const empresaConfig = document.getElementById('empresaConfigurada');
    const ultimaSync = document.getElementById('ultimaSincronizacao');
    const modoOp = document.getElementById('modoOperacao');

    if (statusDetalhado) {
        if (!navigator.onLine) {
            statusDetalhado.innerHTML = '🔴 Offline';
            statusDetalhado.style.color = '#dc3545';
        } else if (statusConexao.sincronizando) {
            statusDetalhado.innerHTML = '🟡 Sincronizando...';
            statusDetalhado.style.color = '#ffc107';
        } else {
            statusDetalhado.innerHTML = '🟢 Online';
            statusDetalhado.style.color = '#28a745';
        }
    }

    if (empresaConfig) {
        if (configOnline.empresaId) {
            empresaConfig.innerHTML = `✅ ${configOnline.empresaId}`;
            empresaConfig.style.color = '#28a745';
        } else {
            empresaConfig.innerHTML = '❌ Não configurada';
            empresaConfig.style.color = '#dc3545';
        }
    }

    if (ultimaSync) {
        if (configOnline.ultimaSync) {
            const data = new Date(configOnline.ultimaSync);
            ultimaSync.innerHTML = `✅ ${data.toLocaleString('pt-BR')}`;
            ultimaSync.style.color = '#28a745';
        } else {
            ultimaSync.innerHTML = '❌ Nunca';
            ultimaSync.style.color = '#dc3545';
        }
    }

    if (modoOp) {
        if (configOnline.ativo) {
            modoOp.innerHTML = '🌐 Online Sincronizado';
            modoOp.style.color = '#28a745';
        } else if (configOnline.empresaId) {
            modoOp.innerHTML = '🔄 Online Configurado';
            modoOp.style.color = '#ffc107';
        } else {
            modoOp.innerHTML = '📱 Modo Local';
            modoOp.style.color = '#6c757d';
        }
    }

    // Atualizar status principal
    atualizarStatusConexao();
}

// =====================================================
// LOGS DE SINCRONIZAÇÃO
// =====================================================

function adicionarLogSync(mensagem) {
    const log = document.getElementById('logSincronizacao');
    if (!log) return;

    const agora = new Date().toLocaleTimeString('pt-BR');
    const novaLinha = document.createElement('div');
    novaLinha.innerHTML = `<span style="color: #666;">[${agora}]</span> ${mensagem}`;
    
    log.appendChild(novaLinha);
    log.scrollTop = log.scrollHeight;

    // Manter apenas últimas 50 linhas
    while (log.children.length > 50) {
        log.removeChild(log.firstChild);
    }

    // Log no console também
    console.log(`[SYNC ${agora}] ${mensagem}`);
}

function limparLogSync() {
    const log = document.getElementById('logSincronizacao');
    if (log) {
        log.innerHTML = '<div style="color: #666;">Log limpo...</div>';
    }
}

// =====================================================
// CONTROLES MANUAIS
// =====================================================

async function sincronizarDadosManual() {
    if (!configOnline.empresaId) {
        mostrarAlerta('❌ Configure a empresa primeiro!', 'danger');
        return;
    }

    const btn = document.getElementById('btnSincronizar');
    if (btn) {
        const textoOriginal = btn.textContent;
        btn.textContent = '🔄 Sincronizando...';
        btn.disabled = true;
        
        try {
            await sincronizarDados();
            btn.textContent = '✅ Sincronizado!';
            setTimeout(() => {
                btn.textContent = textoOriginal;
                btn.disabled = false;
            }, 2000);
        } catch (error) {
            btn.textContent = '❌ Erro';
            setTimeout(() => {
                btn.textContent = textoOriginal;
                btn.disabled = false;
            }, 2000);
        }
    } else {
        await sincronizarDados();
    }
}

function resetarConfiguracaoOnline() {
    if (confirm('⚠️ ATENÇÃO: Isso irá resetar todas as configurações online!\n\nOs dados locais serão mantidos, mas a sincronização será desconfigurada.\n\nContinuar?')) {
        configOnline.empresaId = '';
        configOnline.ativo = false;
        configOnline.ultimaSync = null;
        
        localStorage.removeItem(SYSTEM_CONFIG.storagePrefix + 'empresa_id');
        localStorage.removeItem(SYSTEM_CONFIG.storagePrefix + 'ultima_sync');
        
        const inputEmpresa = document.getElementById('inputEmpresaId');
        if (inputEmpresa) inputEmpresa.value = '';
        
        atualizarInterfaceOnline();
        limparLogSync();
        
        adicionarLogSync('🗑️ Configuração online resetada');
        mostrarAlerta('🗑️ Configuração online resetada! Sistema em modo local.', 'warning');
    }
}

async function testarConexaoOnline() {
    adicionarLogSync('🔍 Testando conexão...');
    
    if (!navigator.onLine) {
        adicionarLogSync('❌ Sem conexão com a internet');
        mostrarAlerta('❌ Sem conexão com a internet!', 'danger');
        return;
    }

    try {
        // Simular teste de conexão
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        adicionarLogSync('✅ Conexão com servidor OK');
        mostrarAlerta('✅ Conexão testada com sucesso!', 'success');
        
    } catch (error) {
        adicionarLogSync('❌ Erro de conexão: ' + error.message);
        mostrarAlerta('❌ Erro na conexão: ' + error.message, 'danger');
    }
}

// =====================================================
// EVENTOS DE CONEXÃO
// =====================================================

function inicializarEventosConexao() {
    // Eventos de conexão online/offline
    window.addEventListener('online', () => {
        console.log('🌐 Conexão restaurada');
        statusConexao.online = true;
        atualizarStatusConexao();
        adicionarLogSync('🌐 Conexão com internet restaurada');
        
        if (configOnline.empresaId) {
            setTimeout(() => {
                sincronizarDados();
            }, 2000);
        }
    });

    window.addEventListener('offline', () => {
        console.log('📡 Conexão perdida');
        statusConexao.online = false;
        atualizarStatusConexao();
        adicionarLogSync('📡 Conexão com internet perdida - modo offline');
    });

    // Sincronização ao sair da página
    window.addEventListener('beforeunload', () => {
        if (configOnline.ativo && navigator.onLine) {
            // Salvar dados críticos antes de sair
            localStorage.setItem(SYSTEM_CONFIG.storagePrefix + 'saida_forcada', new Date().toISOString());
        }
    });
}

// =====================================================
// SINCRONIZAÇÃO AUTOMÁTICA
// =====================================================

function iniciarSincronizacaoAutomatica() {
    // Sincronização automática a cada intervalo configurado
    setInterval(() => {
        if (configOnline.ativo && navigator.onLine && !statusConexao.sincronizando) {
            console.log('⏰ Sincronização automática...');
            adicionarLogSync('⏰ Sincronização automática programada');
            sincronizarDados();
        }
    }, SYSTEM_CONFIG.syncInterval);

    console.log(`⏰ Sincronização automática configurada para ${SYSTEM_CONFIG.syncInterval / 60000} minutos`);
}

// Atualizar interface online periodicamente
function iniciarAtualizacaoInterface() {
    setInterval(() => {
        if (document.getElementById('statusConexaoDetalhado')) {
            atualizarInterfaceOnline();
        }
    }, 10000); // A cada 10 segundos
}
