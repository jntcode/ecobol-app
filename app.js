(() => {
    'use strict';

    // ========== DATA LAYER ==========
    const DB = {
        getUsers: () => JSON.parse(localStorage.getItem('ecobol_users') || '[]'),
        saveUsers: (users) => localStorage.setItem('ecobol_users', JSON.stringify(users)),
        getCurrentUser: () => JSON.parse(localStorage.getItem('ecobol_current') || 'null'),
        setCurrentUser: (user) => localStorage.setItem('ecobol_current', JSON.stringify(user)),
        getCollects: (userId) => {
            const all = JSON.parse(localStorage.getItem('ecobol_collects') || '[]');
            return all.filter(c => c.userId === userId);
        },
        saveCollect: (collect) => {
            const all = JSON.parse(localStorage.getItem('ecobol_collects') || '[]');
            const idx = all.findIndex(c => c.id === collect.id);
            if (idx >= 0) {
                all[idx] = collect;
            } else {
                all.push(collect);
            }
            localStorage.setItem('ecobol_collects', JSON.stringify(all));
        },
        deleteCollect: (id) => {
            const all = JSON.parse(localStorage.getItem('ecobol_collects') || '[]');
            localStorage.setItem('ecobol_collects', JSON.stringify(all.filter(c => c.id !== id)));
        },
        generateId: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    };

    // ========== DOM HELPERS ==========
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ========== SCREENS ==========
    const screens = {
        login: $('#login-screen'),
        register: $('#register-screen'),
        home: $('#home-screen'),
        locations: $('#locations-screen')
    };

    function showScreen(name) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[name].classList.add('active');
    }

    // ========== TOAST ==========
    const toastEl = $('#toast');
    let toastTimeout;
    function showToast(msg, type = 'success') {
        clearTimeout(toastTimeout);
        toastEl.textContent = msg;
        toastEl.className = `toast ${type} show`;
        toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 3000);
    }

    // ========== AUTH ==========
    function initAuth() {
        $('#go-register').addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('register');
        });

        $('#go-login').addEventListener('click', (e) => {
            e.preventDefault();
            showScreen('login');
        });

        $('#login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = $('#login-email').value.trim();
            const password = $('#login-password').value;
            const users = DB.getUsers();
            const user = users.find(u => u.email === email && u.password === password);
            if (!user) {
                showToast('E-mail ou senha incorretos', 'error');
                return;
            }
            DB.setCurrentUser(user);
            showScreen('home');
            loadCollects();
            showToast(`Bem-vindo, ${user.name.split(' ')[0]}!`);
        });

        $('#register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = $('#reg-name').value.trim();
            const email = $('#reg-email').value.trim();
            const phone = $('#reg-phone').value.trim();
            const password = $('#reg-password').value;
            const confirm = $('#reg-confirm').value;

            if (password !== confirm) {
                showToast('As senhas não coincidem', 'error');
                return;
            }

            const users = DB.getUsers();
            if (users.find(u => u.email === email)) {
                showToast('E-mail já cadastrado', 'error');
                return;
            }

            const newUser = {
                id: DB.generateId(),
                name,
                email,
                phone,
                password,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            DB.saveUsers(users);
            DB.setCurrentUser(newUser);
            showScreen('home');
            loadCollects();
            showToast('Conta criada com sucesso!');
        });

        $('#btn-logout').addEventListener('click', () => {
            DB.setCurrentUser(null);
            showScreen('login');
            $('#login-email').value = '';
            $('#login-password').value = '';
            showToast('Sessão encerrada');
        });
    }

    // ========== MODAL ==========
    const modal = $('#modal');
    const detailModal = $('#detail-modal');

    function openModal(title) {
        $('#modal-title').textContent = title;
        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
        $('#collect-form').reset();
        $('#collect-id').value = '';
    }

    function openDetail(collect) {
        const deviceIcons = {
            'Celular': '📱', 'Notebook': '💻', 'Tablet': '📱', 'Monitor': '🖥️',
            'TV': '📺', 'Impressora': '🖨️', 'Ar-Condicionado': '❄️',
            'Geladeira': '🧊', 'Máquina de Lavar': '👕', 'Outros': '📦'
        };
        const icon = deviceIcons[collect.device] || '📦';
        const date = new Date(collect.createdAt).toLocaleDateString('pt-BR');

        $('#detail-body').innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Aparelho</span>
                <span class="detail-value">${icon} ${collect.device}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Marca/Modelo</span>
                <span class="detail-value">${collect.brand || '—'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Condição</span>
                <span class="detail-value">${collect.condition}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Endereço</span>
                <span class="detail-value">${collect.address}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Data Preferida</span>
                <span class="detail-value">${new Date(collect.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value"><span class="collect-card-status ${collect.status}">${collect.status}</span></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Observações</span>
                <span class="detail-value">${collect.notes || '—'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Registrado em</span>
                <span class="detail-value">${date}</span>
            </div>
        `;

        detailModal.classList.add('active');
        detailModal.dataset.id = collect.id;
    }

    function closeDetail() {
        detailModal.classList.remove('active');
    }

    function initModal() {
        $('#modal-close').addEventListener('click', closeModal);
        $('#modal-close-btn').addEventListener('click', closeModal);
        $('#detail-close').addEventListener('click', closeDetail);
        $('#detail-close-btn').addEventListener('click', closeDetail);

        $('#btn-add').addEventListener('click', () => openModal('Nova Coleta'));
        $('#nav-add').addEventListener('click', () => openModal('Nova Coleta'));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) closeDetail();
        });
    }

    // ========== CRUD ==========
    function loadCollects() {
        const user = DB.getCurrentUser();
        if (!user) return;

        const collects = DB.getCollects(user.id);
        const list = $('#collect-list');

        // Update stats
        $('#stat-total').textContent = collects.length;
        $('#stat-pending').textContent = collects.filter(c => c.status === 'Pendente' || c.status === 'Agendado').length;
        $('#stat-collected').textContent = collects.filter(c => c.status === 'Coletado').length;

        if (collects.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>Nenhuma coleta registrada</p>
                    <span>Adicione sua primeira coleta!</span>
                </div>
            `;
            return;
        }

        const deviceIcons = {
            'Celular': '📱', 'Notebook': '💻', 'Tablet': '📱', 'Monitor': '🖥️',
            'TV': '📺', 'Impressora': '🖨️', 'Ar-Condicionado': '❄️',
            'Geladeira': '🧊', 'Máquina de Lavar': '👕', 'Outros': '📦'
        };

        collects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        list.innerHTML = collects.map(c => {
            const icon = deviceIcons[c.device] || '📦';
            const date = new Date(c.date + 'T12:00:00').toLocaleDateString('pt-BR');
            return `
                <div class="collect-card status-${c.status}" data-id="${c.id}">
                    <div class="collect-card-header">
                        <span class="collect-card-device">${icon} ${c.device}</span>
                        <span class="collect-card-status ${c.status}">${c.status}</span>
                    </div>
                    <div class="collect-card-info">
                        <span>📍 ${c.address}</span>
                        <span>📅 ${date} · ${c.condition}</span>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('.collect-card').forEach(card => {
            card.addEventListener('click', () => {
                const c = collects.find(x => x.id === card.dataset.id);
                if (c) openDetail(c);
            });
        });
    }

    function saveCollect(e) {
        e.preventDefault();
        const user = DB.getCurrentUser();
        if (!user) return;

        const id = $('#collect-id').value || DB.generateId();
        const isNew = !$('#collect-id').value;

        const collect = {
            id,
            userId: user.id,
            device: $('#collect-device').value,
            brand: $('#collect-brand').value.trim(),
            condition: $('#collect-condition').value,
            address: $('#collect-address').value.trim(),
            date: $('#collect-date').value,
            status: $('#collect-status').value,
            notes: $('#collect-notes').value.trim(),
            createdAt: isNew ? new Date().toISOString() : (JSON.parse(localStorage.getItem('ecobol_collects') || '[]').find(c => c.id === id)?.createdAt || new Date().toISOString()),
            updatedAt: new Date().toISOString()
        };

        DB.saveCollect(collect);
        closeModal();
        loadCollects();
        showToast(isNew ? 'Coleta registrada!' : 'Coleta atualizada!');
    }

    function deleteCollect(id) {
        if (!confirm('Tem certeza que deseja excluir esta coleta?')) return;
        DB.deleteCollect(id);
        closeDetail();
        loadCollects();
        showToast('Coleta excluída');
    }

    function initCrud() {
        $('#collect-form').addEventListener('submit', saveCollect);

        $('#btn-edit-detail').addEventListener('click', () => {
            const id = detailModal.dataset.id;
            const user = DB.getCurrentUser();
            const collect = DB.getCollects(user.id).find(c => c.id === id);
            if (!collect) return;

            closeDetail();

            setTimeout(() => {
                $('#collect-id').value = collect.id;
                $('#collect-device').value = collect.device;
                $('#collect-brand').value = collect.brand;
                $('#collect-condition').value = collect.condition;
                $('#collect-address').value = collect.address;
                $('#collect-date').value = collect.date;
                $('#collect-status').value = collect.status;
                $('#collect-notes').value = collect.notes || '';
                openModal('Editar Coleta');
            }, 300);
        });

        $('#btn-delete-detail').addEventListener('click', () => {
            deleteCollect(detailModal.dataset.id);
        });

        $('#nav-profile').addEventListener('click', () => {
            const user = DB.getCurrentUser();
            if (user) {
                showToast(`${user.name} · ${user.email}`);
            }
        });
    }

    // ========== COLLECTION POINTS ==========
    const COLLECTION_POINTS = [
        { id: 1, name: "Ecoponto Centro", address: "Rua XV de Novembro, 1000 - Centro, Bauru/SP", lat: -22.3246, lng: -49.0871, hours: "Seg-Sex 8h-17h", phone: "(14) 3234-0001" },
        { id: 2, name: "Recicla Tech Bauru", address: "Av. Brasil, 2500 - Jardim Brasil, Bauru/SP", lat: -22.3315, lng: -49.0723, hours: "Seg-Sáb 9h-18h", phone: "(14) 3234-0002" },
        { id: 3, name: "Coleta Verde", address: "Rua Taguai, 500 - Vila Mariana, Bauru/SP", lat: -22.3198, lng: -49.0945, hours: "Seg-Sex 7h-16h", phone: "(14) 3234-0003" },
        { id: 4, name: "Ponto Eco Norte", address: "Av. Anhanguera, 800 - Jardim São Paulo, Bauru/SP", lat: -22.3105, lng: -49.0812, hours: "Seg-Sex 8h-17h", phone: "(14) 3234-0004" },
        { id: 5, name: "Estação Reciclagem Sul", address: "Rua dos Ipês, 300 - Jardim Ipê, Bauru/SP", lat: -22.3402, lng: -49.0930, hours: "Seg-Sáb 8h-16h", phone: "(14) 3234-0005" },
        { id: 6, name: "EcoPoint Aparelhos", address: "Rua Curitiba, 1200 - Centro, Bauru/SP", lat: -22.3268, lng: -49.0765, hours: "Seg-Sex 9h-18h", phone: "(14) 3234-0006" }
    ];

    let map = null;

    function initLocations() {
        $('#go-locations').addEventListener('click', () => {
            showScreen('locations');
            if (!map) {
                initMap();
            } else {
                setTimeout(() => map.invalidateSize(), 100);
            }
        });

        $('#btn-back-locations').addEventListener('click', () => {
            showScreen('login');
        });
    }

    function initMap() {
        map = L.map('map').setView([-22.3246, -49.0871], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const greenIcon = L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-pin">♻️</div>',
            iconSize: [36, 42],
            iconAnchor: [18, 42],
            popupAnchor: [0, -42]
        });

        const listEl = $('#locations-list');
        listEl.innerHTML = '';

        COLLECTION_POINTS.forEach(point => {
            L.marker([point.lat, point.lng], { icon: greenIcon })
                .addTo(map)
                .bindPopup(`
                    <div class="popup-content">
                        <strong>${point.name}</strong><br>
                        📍 ${point.address}<br>
                        🕐 ${point.hours}<br>
                        📞 ${point.phone}
                    </div>
                `);

            const card = document.createElement('div');
            card.className = 'location-card';
            card.innerHTML = `
                <div class="location-card-icon">♻️</div>
                <div class="location-card-info">
                    <h4>${point.name}</h4>
                    <p>📍 ${point.address}</p>
                    <span>🕐 ${point.hours} · 📞 ${point.phone}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                map.setView([point.lat, point.lng], 16);
                map.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        layer.openPopup();
                    }
                });
            });
            listEl.appendChild(card);
        });

        setTimeout(() => map.invalidateSize(), 100);
    }

    // ========== INIT ==========
    function init() {
        initAuth();
        initModal();
        initCrud();
        initLocations();

        // Check if already logged in
        const user = DB.getCurrentUser();
        if (user) {
            showScreen('home');
            loadCollects();
        } else {
            showScreen('login');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
