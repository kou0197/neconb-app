let draggedKey = null;
  let touchDraggedCard = null;
  let touchStartY = 0;
  let scrollPositionBeforeModal = 0;
  let isDirty = false;

  /* --- ホーム画面カルーセル（画像スライダー）管理 --- */
  const bannerImages = [
    "images/image1.jpg",
    "images/image2.jpg"
  ];
  let currentCarouselIndex = 0;

  function initCarousel() {
    const track = document.getElementById('carousel-track');
    const dotsContainer = document.getElementById('carousel-dots');
    if (!track || !dotsContainer) return;

    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    bannerImages.forEach((src, index) => {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      slide.innerHTML = `<img src="${src}" alt="Banner ${index + 1}" onerror="this.src=''">`;
      track.appendChild(slide);

      const dot = document.createElement('div');
      dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
      dot.onclick = () => goToCarouselSlide(index);
      dotsContainer.appendChild(dot);
    });

    updateCarousel();
  }

  function moveCarousel(direction) {
    currentCarouselIndex += direction;
    if (currentCarouselIndex < 0) currentCarouselIndex = bannerImages.length - 1;
    if (currentCarouselIndex >= bannerImages.length) currentCarouselIndex = 0;
    updateCarousel();
  }

  function goToCarouselSlide(index) {
    currentCarouselIndex = index;
    updateCarousel();
  }

  function updateCarousel() {
    const track = document.getElementById('carousel-track');
    const dots = document.querySelectorAll('.carousel-dot');
    if (track) {
      track.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
    }
    dots.forEach((dot, index) => {
      if (index === currentCarouselIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function updateHomeDashboardStats() {
    const codeCountEl = document.getElementById('home-stat-code-count');
    if (codeCountEl) {
      const count = Object.keys(slotNames || {}).length;
      codeCountEl.innerText = `保存済みコーデ: ${count} 件`;
    }
    const teamInfoEl = document.getElementById('home-stat-team-info');
    if (teamInfoEl) {
      teamInfoEl.innerText = `抽選対象ブキ: ${(activeWeapons || []).length} 種`;
    }
  }

  function initDragAndDrop() {
    const container = document.getElementById('slots-wrapper');
    if (!container) return;

    let placeholder = document.createElement('div');
    placeholder.className = 'slot-drop-placeholder';

    container.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.visual-slot-card');
      if (!card) return;
      draggedKey = card.getAttribute('data-key');
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    container.addEventListener('dragend', (e) => {
      const card = e.target.closest('.visual-slot-card');
      if (card) card.classList.remove('dragging');
      if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      draggedKey = null;
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY, e.clientX);
      const draggingCard = document.querySelector('.dragging');
      if (draggingCard) {
        if (afterElement == null) {
          container.appendChild(placeholder);
        } else {
          container.insertBefore(placeholder, afterElement);
        }
        container.insertBefore(draggingCard, placeholder);
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      reorderSlotKeysFromDOM();
    });
  }

  function getDragAfterElement(container, y, x) {
    const draggableElements = [...container.querySelectorAll('.visual-slot-card:not(.dragging)')];
    const isHorizontal = window.innerWidth <= 768;

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = isHorizontal ? x - box.left - box.width / 2 : y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function reorderSlotKeysFromDOM() {
    const container = document.getElementById('slots-wrapper');
    const cards = [...container.querySelectorAll('.visual-slot-card')];
    const newKeys = cards.map(c => c.getAttribute('data-key')).filter(Boolean);

    if (!newKeys.length) return;

    const newSlotNames = {};
    const newSlotsData = {};

    newKeys.forEach(k => {
      if (slotNames[k]) newSlotNames[k] = slotNames[k];
      if (slotsData[k]) newSlotsData[k] = slotsData[k];
    });

    slotNames = newSlotNames;
    slotsData = newSlotsData;

    saveAllToStorage();
    renderTagFilterBar();
    renderVisualSlots();
    showToast("順番を変更しました");
  }

  function attachTouchDragEvents(card, key) {
    const handle = card.querySelector('.drag-handle');
    if (!handle) return;

    let placeholder = document.createElement('div');
    placeholder.className = 'slot-drop-placeholder';

    handle.addEventListener('touchstart', (e) => {
      touchDraggedCard = card;
      card.classList.add('dragging');
      if (e.touches.length > 0) touchStartY = e.touches[0].clientY;
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      if (!touchDraggedCard) return;
      if (e.touches.length === 0) return;
      
      const touch = e.touches[0];
      const container = document.getElementById('slots-wrapper');
      const afterElement = getDragAfterElement(container, touch.clientY, touch.clientX);
      
      if (afterElement == null) {
        container.appendChild(placeholder);
      } else {
        container.insertBefore(placeholder, afterElement);
      }
      container.insertBefore(touchDraggedCard, placeholder);
    }, { passive: true });

    card.addEventListener('touchend', () => {
      if (touchDraggedCard) {
        touchDraggedCard.classList.remove('dragging');
        if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
        touchDraggedCard = null;
        reorderSlotKeysFromDOM();
      }
    });
  }

  function toggleAccordion(btnId, wrapperId, forceOpen = null) {
    const btn = document.getElementById(btnId);
    const wrapper = document.getElementById(wrapperId);
    if (!btn || !wrapper) return;
    const isOpen = forceOpen !== null ? forceOpen : !wrapper.classList.contains('open');
    if (isOpen) {
      wrapper.classList.add('open');
      btn.classList.add('open');
    } else {
      wrapper.classList.remove('open');
      btn.classList.remove('open');
    }
  }

  function toggleTeamSidebarCollapse(forceOpen = null) {
    const btn = document.getElementById('team-sidebar-toggle-btn');
    const wrapper = document.getElementById('team-sidebar-collapsible-wrapper');
    if (!wrapper) return;
    const isClosed = forceOpen !== null ? !forceOpen : !wrapper.classList.contains('closed');
    if (isClosed) {
      wrapper.classList.add('closed');
      if (btn) btn.classList.add('closed');
    } else {
      wrapper.classList.remove('closed');
      if (btn) btn.classList.remove('closed');
    }
  }

  function toggleSidebarCollapse(forceOpen = null) {
    const btn = document.getElementById('sidebar-toggle-btn');
    const wrapper = document.getElementById('sidebar-collapsible-wrapper');
    if (!wrapper) return;
    const isClosed = forceOpen !== null ? !forceOpen : !wrapper.classList.contains('closed');
    if (isClosed) {
      wrapper.classList.add('closed');
      if (btn) btn.classList.add('closed');
    } else {
      wrapper.classList.remove('closed');
      if (btn) btn.classList.remove('closed');
    }
  }

  const STORAGE_KEY_LAST_TAB = 'spla3_last_tab_v1';

  // タブ切り替え関数
  function switchMainTab(tabId, event) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));

    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));

    const targetContent = document.getElementById(`tab-${tabId}`);
    if (targetContent) targetContent.classList.add('active');

    if (event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    } else {
      const activeBtn = document.querySelector(`.nav-tab-btn[onclick*="'${tabId}'"]`);
      if (activeBtn) activeBtn.classList.add('active');
    }

    if (tabId === 'home') updateHomeDashboardStats();
    if (tabId !== 'editor') closeMyCodeDrawer();

    localStorage.setItem(STORAGE_KEY_LAST_TAB, tabId);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reloadCurrentPage() {
    location.reload();
  }

  function toggleHeaderMenu(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('header-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
  }

  function closeHeaderMenu() {
    const dropdown = document.getElementById('header-dropdown');
    if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
  }

  window.addEventListener('click', function(e) {
    if (!e.target.matches('.icon-menu-btn')) closeHeaderMenu();
  });

  let toastTimer = null;
  function showToast(message, iconClass = "") {
    const container = document.getElementById('toast-container');
    if (!container) return;
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let iconHtml = iconClass ? `<span class="tab-icon ${iconClass}" style="width:20px; height:20px; flex-shrink:0;"></span>` : "";
    toast.innerHTML = `${iconHtml}<span>${message}</span>`;
    
    container.appendChild(toast);

    toastTimer = setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 2000);
  }

  const STORAGE_KEY_THEME = 'spla3_app_theme_v1';
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    applyTheme(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY_THEME, nextTheme);
  }

  function applyTheme(theme) {
    const themeIcon = document.getElementById('theme-icon');
    const themeLabel = document.getElementById('theme-label');
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (themeIcon) themeIcon.innerText = '☀️';
      if (themeLabel) themeLabel.innerText = 'ダークモード';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeIcon) themeIcon.innerText = '🌙';
      if (themeLabel) themeLabel.innerText = 'ライトモード';
    }
  }

  /* ==========================================================================
     スマホ向けドロワー＆常時固定クイックバー制御
     ========================================================================== */

  let isDrawerOpen = false;

  function openMyCodeDrawer() {
    const sidebar = document.getElementById('editor-sidebar');
    const overlay = document.getElementById('drawer-overlay');
    if (sidebar && overlay) {
      sidebar.classList.add('drawer-open');
      overlay.classList.add('active');
      isDrawerOpen = true;
    }
  }

  function closeMyCodeDrawer() {
    const sidebar = document.getElementById('editor-sidebar');
    const overlay = document.getElementById('drawer-overlay');
    if (sidebar && overlay) {
      sidebar.classList.remove('drawer-open');
      overlay.classList.remove('active');
      isDrawerOpen = false;
    }
  }

  function toggleMyCodeDrawer() {
    if (isDrawerOpen) {
      closeMyCodeDrawer();
    } else {
      openMyCodeDrawer();
    }
  }

  function quickSaveCurrentSlot() {
    if (!currentActiveSlotKey) {
      addNewSlot();
      return;
    }
    saveSlotData(currentActiveSlotKey);
  }

  function markAsDirty() {
    isDirty = true;
    const bar = document.getElementById('quick-save-bar');
    const btn = document.getElementById('quick-save-btn');
    const btnText = document.getElementById('quick-save-btn-text');
    if (bar) bar.classList.add('has-unsaved-changes');
    if (btn) btn.classList.add('unsaved');
    if (btnText) btnText.innerText = "上書き保存";
  }

  function markAsClean() {
    isDirty = false;
    const bar = document.getElementById('quick-save-bar');
    const btn = document.getElementById('quick-save-btn');
    const btnText = document.getElementById('quick-save-btn-text');
    if (bar) bar.classList.remove('has-unsaved-changes');
    if (btn) btn.classList.remove('unsaved');
    if (btnText) btnText.innerText = "保存";
  }

  function updateQuickBarUI() {
    const nameEl = document.getElementById('quick-bar-slot-name');
    if (!nameEl) return;
    if (currentActiveSlotKey && slotNames[currentActiveSlotKey]) {
      nameEl.innerText = slotNames[currentActiveSlotKey];
    } else {
      nameEl.innerText = "（未選択・編集のみ）";
    }
  }

  const STORAGE_KEY_UNSAVED_BACKUP = 'spla3_unsaved_backup_v1';
  function backupCurrentEditorState() {
    const backupData = {
      weapon: getWeaponSlotElementData(),
      gear: { head: getGearPartData('head'), clothes: getGearPartData('clothes'), shoes: getGearPartData('shoes') },
      sensitivity: { gyro: document.getElementById('input-gyro')?.value || "0.0", stick: document.getElementById('input-stick')?.value || "0.0" },
      memo: document.getElementById('input-memo')?.value || "",
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_UNSAVED_BACKUP, JSON.stringify(backupData));
  }

  function restoreUnsavedState() {
    const saved = localStorage.getItem(STORAGE_KEY_UNSAVED_BACKUP);
    if (!saved) { showToast("復元データがありません", "icon-note"); return; }
    try {
      const data = JSON.parse(saved);
      selectWeapon(data.weapon.name, data.weapon.image, data.weapon.subImage, data.weapon.spImage);
      ['head', 'clothes', 'shoes'].forEach(part => {
        const gPart = data.gear[part];
        selectGear(part, gPart.name, gPart.image, false);
        ['main', 'sub0', 'sub1', 'sub2'].forEach(slot => {
          selectPower(part, slot, gPart[slot].name, gPart[slot].image, false);
        });
      });
      updateSens('gyro', data.sensitivity.gyro);
      updateSens('stick', data.sensitivity.stick);
      const memoInput = document.getElementById('input-memo');
      if (memoInput) memoInput.value = data.memo || "";
      calculateAndRenderGearTotals();
      markAsDirty();
      showToast("↺ 編集状態を復元しました！");
    } catch (e) {
      showToast("復元に失敗しました", "icon-fail");
    }
  }

  const STORAGE_KEY_FAV_GEARS = 'spla3_favorite_gears_v1';
  const STORAGE_KEY_FAV_WEAPONS = 'spla3_favorite_weapons_v1';
  const STORAGE_KEY_CUSTOM_GEAR_POWERS = 'spla3_custom_gear_powers_v1';
  const STORAGE_KEY_RECENT_WEAPONS = 'spla3_recent_weapons_v1';
  const STORAGE_KEY_RECENT_GEARS = 'spla3_recent_gears_v1';
  const STORAGE_KEY_MY_GEARS = 'spla3_my_gears_list_v1';
  const STORAGE_KEY_CUSTOM_TAGS = 'spla3_custom_global_tags_v1';
  const MAX_RECENT_COUNT = 12;
  
  let favoriteGears = new Set(), favoriteWeapons = new Set(), customGearPowers = {};
  let recentWeapons = [], recentGears = { head: [], clothes: [], shoes: [] }, myGearsList = { head: [], clothes: [], shoes: [] };
  let selectedFilterPower = "", selectedFilterBrand = "", selectedFilterCat = "", selectedFilterSub = "", selectedFilterSp = "", searchQueryText = "";
  let renderQueueList = [], currentRenderedIndex = 0;
  const CHUNK_SIZE = 100;

  function loadFavorites() {
    const savedGears = localStorage.getItem(STORAGE_KEY_FAV_GEARS);
    if (savedGears) { try { favoriteGears = new Set(JSON.parse(savedGears)); } catch(e) {} }
    const savedWeapons = localStorage.getItem(STORAGE_KEY_FAV_WEAPONS);
    if (savedWeapons) { try { favoriteWeapons = new Set(JSON.parse(savedWeapons)); } catch(e) {} }
    const savedCustomGears = localStorage.getItem(STORAGE_KEY_CUSTOM_GEAR_POWERS);
    if (savedCustomGears) { try { customGearPowers = JSON.parse(savedCustomGears); } catch(e) {} }
    const savedRecentWeapons = localStorage.getItem(STORAGE_KEY_RECENT_WEAPONS);
    if (savedRecentWeapons) { try { recentWeapons = JSON.parse(savedRecentWeapons); } catch(e) {} }
    const savedRecentGears = localStorage.getItem(STORAGE_KEY_RECENT_GEARS);
    if (savedRecentGears) { try { recentGears = JSON.parse(savedRecentGears); } catch(e) {} }
    const savedMyGears = localStorage.getItem(STORAGE_KEY_MY_GEARS);
    if (savedMyGears) { try { myGearsList = JSON.parse(savedMyGears); } catch(e) {} }
  }

  function saveCurrentGearAsMyGear(part) {
    const gearSlot = document.getElementById(`slot-${part}`);
    const name = gearSlot?.getAttribute('data-name');
    if (!name || name === '未選択') { showToast("ギアを選択してください", "icon-fail"); return; }
    const mainPower = document.getElementById(`${part}-main`)?.getAttribute('data-name') || "未選択";
    const sub0 = document.getElementById(`${part}-sub0`)?.getAttribute('data-name') || "-";
    const sub1 = document.getElementById(`${part}-sub1`)?.getAttribute('data-name') || "-";
    const sub2 = document.getElementById(`${part}-sub2`)?.getAttribute('data-name') || "-";
    const imageEl = gearSlot.querySelector('.image-placeholder img');
    const image = imageEl ? imageEl.getAttribute('src') : "";

    const newMyGear = { id: "mygear_" + Date.now(), name, image, main: mainPower, subs: [sub0, sub1, sub2] };
    if (!myGearsList[part]) myGearsList[part] = [];
    myGearsList[part].unshift(newMyGear);
    localStorage.setItem(STORAGE_KEY_MY_GEARS, JSON.stringify(myGearsList));
    showToast(`📦 「${name}」をマイギアに保存しました！`);
  }

  function deleteMyGearItem(part, id, event) {
    if (event) event.stopPropagation();
    if (confirm("⚠️ このマイギアを削除しますか？")) {
      if (myGearsList[part]) {
        myGearsList[part] = myGearsList[part].filter(g => g.id !== id);
        localStorage.setItem(STORAGE_KEY_MY_GEARS, JSON.stringify(myGearsList));
        openMyGearModal(part, false);
        showToast("マイギアから削除しました", "icon-delete");
      }
    }
  }

  function pushRecentWeapon(item) {
    if (!item || !item.name || item.name === "未選択") return;
    recentWeapons = recentWeapons.filter(w => w.name !== item.name);
    recentWeapons.unshift(item);
    if (recentWeapons.length > MAX_RECENT_COUNT) recentWeapons = recentWeapons.slice(0, MAX_RECENT_COUNT);
    localStorage.setItem(STORAGE_KEY_RECENT_WEAPONS, JSON.stringify(recentWeapons));
  }

  function pushRecentGear(part, item) {
    if (!item || !item.name || item.name === "未選択") return;
    if (!recentGears[part]) recentGears[part] = [];
    recentGears[part] = recentGears[part].filter(g => g.name !== item.name);
    recentGears[part].unshift(item);
    if (recentGears[part].length > MAX_RECENT_COUNT) recentGears[part] = recentGears[part].slice(0, MAX_RECENT_COUNT);
    localStorage.setItem(STORAGE_KEY_RECENT_GEARS, JSON.stringify(recentGears));
  }

  function clearModalHistory() {
    const ctx = currentModalContext.type;
    const part = currentModalContext.part;
    
    if (ctx.includes('weapon') || ctx.includes('Weapon')) {
      if (confirm("⚠️ ブキの選択履歴をすべてクリアしますか？")) {
        recentWeapons = [];
        localStorage.removeItem(STORAGE_KEY_RECENT_WEAPONS);
        filterModalItems();
        showToast("ブキ履歴をリセットしました", "icon-delete");
      }
    } else if (ctx.includes('gear') || ctx.includes('Gear') || ctx.includes('myGear')) {
      const partTitles = { head: "アタマ", clothes: "フク", shoes: "クツ" };
      if (confirm(`⚠️ ${partTitles[part] || ''}の選択履歴をすべてクリアしますか？`)) {
        if (recentGears[part]) {
          recentGears[part] = [];
          localStorage.setItem(STORAGE_KEY_RECENT_GEARS, JSON.stringify(recentGears));
        }
        filterModalItems();
        showToast("ギア履歴をリセットしました", "icon-delete");
      }
    }
  }

  function toggleFavoriteGear(gearName, event) {
    if (event) event.stopPropagation();
    if (favoriteGears.has(gearName)) favoriteGears.delete(gearName); else favoriteGears.add(gearName);
    localStorage.setItem(STORAGE_KEY_FAV_GEARS, JSON.stringify([...favoriteGears]));
    if (currentModalContext.type === 'gearList') renderGearListItems(currentModalContext.part, currentModalContext.brandIndex);
    else if (currentModalContext.type === 'favoriteGearList') openFavoriteGearModal(currentModalContext.part, false);
    else if (currentModalContext.type === 'recentGearList') openRecentGearModal(currentModalContext.part, false);
    else if (currentModalContext.type === 'gearBrand') renderGearBrandView(currentModalContext.part);
  }

  function toggleFavoriteWeapon(weaponName, event) {
    if (event) event.stopPropagation();
    if (favoriteWeapons.has(weaponName)) favoriteWeapons.delete(weaponName); else favoriteWeapons.add(weaponName);
    localStorage.setItem(STORAGE_KEY_FAV_WEAPONS, JSON.stringify([...favoriteWeapons]));
    if (currentModalContext.type === 'weaponList') openWeaponListModal(currentModalContext.categoryIndex);
    else if (currentModalContext.type === 'favoriteWeaponList') openFavoriteWeaponModal();
    else if (currentModalContext.type === 'recentWeaponList') openRecentWeaponModal();
    else if (currentModalContext.type === 'weaponCat') filterModalItems();
  }

  let currentModalContext = { type: '', part: '', brandIndex: -1, categoryIndex: -1, slotType: '' };

  function toggleFilterCollapse(forceOpen = null) {
    toggleAccordion('filter-toggle-btn', 'filter-collapsible-wrapper', forceOpen);
  }

  function updateFilterSummaryText() {
    const summaryEl = document.getElementById('filter-summary-text');
    if (!summaryEl) return;
    let selectedList = [];
    if (currentModalContext.type.includes('gear') || currentModalContext.type.includes('Gear') || currentModalContext.type.includes('myGear')) {
      if (selectedFilterBrand) selectedList.push(selectedFilterBrand);
      if (selectedFilterPower) selectedList.push(selectedFilterPower);
    } else {
      if (selectedFilterCat) selectedList.push(selectedFilterCat);
      if (selectedFilterSub) selectedList.push(selectedFilterSub);
      if (selectedFilterSp) selectedList.push(selectedFilterSp);
    }
    summaryEl.innerText = selectedList.length > 0 ? `（${selectedList.join(' / ')}）` : "";
  }

  function renderQuickAccessBar() {
    const bar = document.getElementById('quick-access-bar');
    if (!bar) return;
    const ctx = currentModalContext.type; const part = currentModalContext.part;
    
    let clearHistoryBtnHTML = "";
    if (ctx === 'recentWeaponList' || ctx === 'recentGearList') {
      clearHistoryBtnHTML = `<button class="quick-access-btn" onclick="clearModalHistory()" style="color:var(--danger-red); border-color:var(--danger-red); display: inline-flex; align-items: center; justify-content: center; gap: 4px;" title="履歴をクリア"><span class="tab-icon icon-delete"></span>クリア</button>`;
    }

    if (ctx.includes('weapon') || ctx.includes('Weapon')) {
      bar.innerHTML = `
        <button class="quick-access-btn ${ctx === 'weaponCat' ? 'active' : ''}" onclick="openWeaponCategoryModal(true)">ALL</button>
        <button class="quick-access-btn ${ctx === 'favoriteWeaponList' ? 'active' : ''}" onclick="openFavoriteWeaponModal()">★お気に入り</button>
        <button class="quick-access-btn ${ctx === 'recentWeaponList' ? 'active' : ''}" onclick="openRecentWeaponModal()">🕒履歴</button>
        ${clearHistoryBtnHTML}
      `;
    } else if (ctx.includes('gear') || ctx.includes('Gear') || ctx.includes('myGear')) {
      bar.innerHTML = `
        <button class="quick-access-btn ${ctx === 'gearBrand' ? 'active' : ''}" onclick="openGearBrandModal('${part}', true)">ALL</button>
        <button class="quick-access-btn ${ctx === 'myGearList' ? 'active' : ''}" onclick="openMyGearModal('${part}', false)">📦マイギア</button>
        <button class="quick-access-btn ${ctx === 'favoriteGearList' ? 'active' : ''}" onclick="openFavoriteGearModal('${part}', false)">★お気に入り</button>
        <button class="quick-access-btn ${ctx === 'recentGearList' ? 'active' : ''}" onclick="openRecentGearModal('${part}', false)">🕒履歴</button>
        ${clearHistoryBtnHTML}
      `;
    } else bar.innerHTML = "";
  }

  function showModal() {
    const modal = document.getElementById('selection-modal');
    const scrollContainer = document.getElementById('modal-scroll-body');
    
    scrollPositionBeforeModal = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${scrollPositionBeforeModal}px`;
    document.body.classList.add('modal-open');

    modal.style.display = "flex";
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }

  function closeModal(event) {
    if (event && event.target !== document.getElementById('selection-modal')) return;
    const modal = document.getElementById('selection-modal');
    modal.style.display = "none";
    
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPositionBeforeModal);
  }

  function setupLazyRender(itemList, renderFn, clearGrid = true) {
    renderQueueList = itemList; currentRenderedIndex = 0;
    if (clearGrid) gridContent.innerHTML = "";
    renderNextChunk(renderFn);
  }

  function renderNextChunk(renderFn) {
    if (currentRenderedIndex >= renderQueueList.length) return;
    const nextBatch = renderQueueList.slice(currentRenderedIndex, currentRenderedIndex + CHUNK_SIZE);
    currentRenderedIndex += CHUNK_SIZE;
    const fragment = document.createDocumentFragment();
    nextBatch.forEach(item => {
      const htmlStr = renderFn(item);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlStr.trim();
      if (tempDiv.firstChild) fragment.appendChild(tempDiv.firstChild);
    });
    gridContent.appendChild(fragment);
  }

  function initModalScrollListener() {
    const scrollContainer = document.getElementById('modal-scroll-body');
    if (!scrollContainer) return;
    scrollContainer.addEventListener('scroll', () => {
      if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 150) {
        if (currentModalContext.type.includes('weapon') || currentModalContext.type.includes('Weapon')) {
          renderNextChunk(createWeaponTileHTML);
        } else if (currentModalContext.type.includes('gear') || currentModalContext.type.includes('Gear') || currentModalContext.type.includes('myGear')) {
          renderNextChunk(createGearTileHTML);
        }
      }
    });
  }

  function resetSearchInput() {
    searchQueryText = "";
    const searchInput = document.getElementById('modal-search-text');
    if (searchInput) searchInput.value = "";
  }

  function onSearchTextChange() {
    const searchInput = document.getElementById('modal-search-text');
    if (searchInput) { searchQueryText = searchInput.value.trim().toLowerCase(); filterModalItems(); }
  }

  const modal = document.getElementById('selection-modal'), modalTitle = document.getElementById('modal-title'), gridContent = document.getElementById('modal-grid-content'), backBtn = document.getElementById('modal-back-btn');
  const filterContainer = document.getElementById('modal-filter-container'), filterCatContainer = document.getElementById('filter-cat-container'), filterCatBar = document.getElementById('filter-cat-bar');
  const filterSubContainer = document.getElementById('filter-sub-container'), filterSubBar = document.getElementById('filter-sub-bar'), filterSpContainer = document.getElementById('filter-sp-container'), filterSpBar = document.getElementById('filter-sp-bar');
  const filterBrandContainer = document.getElementById('filter-brand-container'), filterBrandBar = document.getElementById('filter-brand-bar'), filterGearPowerContainer = document.getElementById('filter-gear-power-container'), gearPowerFilterBar = document.getElementById('filter-gear-power-bar');

  function extractNameFromPath(path) { if (!path) return ''; return path.split('/').pop().replace(/\.[^/.]+$/, ""); }
  function getPowerImagePath(part, powerName) {
    if (!powerName || powerName === "未選択" || powerName === "-") return "";
    const allPowers = [...gearListNormal, ...(gearListLeft[part] || [])];
    const found = allPowers.find(p => p.name === powerName);
    return found ? found.image : "";
  }

  function getGearBrandName(part, gearName) {
    if (gearBrandList[part]) {
      for (let b of gearBrandList[part]) { if (b.items.some(i => i.name === gearName)) return b.brand; }
    }
    return "";
  }

  function initFilterSelects() {
    const catsMap = new Map(), subsMap = new Map(), spsMap = new Map();
    weaponCategoryList.forEach(cat => {
      if (cat.category && !catsMap.has(cat.category)) catsMap.set(cat.category, cat.image);
      cat.weapons.forEach(w => {
        const subName = extractNameFromPath(w.subImage), spName = extractNameFromPath(w.spImage);
        if (subName && !subsMap.has(subName)) subsMap.set(subName, w.subImage);
        if (spName && !spsMap.has(spName)) spsMap.set(spName, w.spImage);
      });
    });

    filterCatBar.innerHTML = `<div class="power-filter-btn ${selectedFilterCat === "" ? "active" : ""}" onclick="selectFilterCat('')" title="すべて">ALL</div>`;
    catsMap.forEach((img, name) => filterCatBar.innerHTML += `<div class="power-filter-btn ${selectedFilterCat === name ? "active" : ""}" onclick="selectFilterCat('${name}')" title="${name}"><img src="${img}"></div>`);

    filterSubBar.innerHTML = `<div class="power-filter-btn ${selectedFilterSub === "" ? "active" : ""}" onclick="selectFilterSub('')" title="すべて">ALL</div>`;
    subsMap.forEach((img, name) => filterSubBar.innerHTML += `<div class="power-filter-btn ${selectedFilterSub === name ? "active" : ""}" onclick="selectFilterSub('${name}')" title="${name}"><img src="${img}"></div>`);

    filterSpBar.innerHTML = `<div class="power-filter-btn ${selectedFilterSp === "" ? "active" : ""}" onclick="selectFilterSp('')" title="すべて">ALL</div>`;
    spsMap.forEach((img, name) => filterSpBar.innerHTML += `<div class="power-filter-btn ${selectedFilterSp === name ? "active" : ""}" onclick="selectFilterSp('${name}')" title="${name}"><img src="${img}"></div>`);

    updateFilterSummaryText(); renderQuickAccessBar();
  }

  function selectFilterCat(catName) { selectedFilterCat = selectedFilterCat === catName ? "" : catName; initFilterSelects(); filterModalItems(); }
  function selectFilterSub(subName) { selectedFilterSub = selectedFilterSub === subName ? "" : subName; initFilterSelects(); filterModalItems(); }
  function selectFilterSp(spName) { selectedFilterSp = selectedFilterSp === spName ? "" : spName; initFilterSelects(); filterModalItems(); }

  function initGearPowerFilterBar(part) {
    filterBrandBar.innerHTML = `<div class="power-filter-btn ${selectedFilterBrand === "" ? "active" : ""}" onclick="selectFilterBrand('', '${part}')" title="すべて">ALL</div>`;
    if (gearBrandList[part]) {
      gearBrandList[part].forEach(b => filterBrandBar.innerHTML += `<div class="power-filter-btn ${selectedFilterBrand === b.brand ? "active" : ""}" onclick="selectFilterBrand('${b.brand}', '${part}')" title="${b.brand}"><img src="${b.image}"></div>`);
    }

    gearPowerFilterBar.innerHTML = `<div class="power-filter-btn ${selectedFilterPower === "" ? "active" : ""}" onclick="selectFilterPower('', '${part}')" title="すべて">ALL</div>`;
    [...(gearListLeft[part] || []), ...gearListNormal].forEach(p => {
      gearPowerFilterBar.innerHTML += `<div class="power-filter-btn ${selectedFilterPower === p.name ? "active" : ""}" onclick="selectFilterPower('${p.name}', '${part}')" title="${p.name}"><img src="${p.image}"></div>`;
    });

    updateFilterSummaryText(); renderQuickAccessBar();
  }

  function selectFilterBrand(brandName, part) { selectedFilterBrand = selectedFilterBrand === brandName ? "" : brandName; initGearPowerFilterBar(part); filterModalItems(); }
  function selectFilterPower(powerName, part) { selectedFilterPower = selectedFilterPower === powerName ? "" : powerName; initGearPowerFilterBar(part); filterModalItems(); }

  function openWeaponCategoryModal(preserveFilterState = false) {
    currentModalContext.type = 'weaponCat'; modalTitle.innerText = "ブキ選択"; backBtn.style.display = "none";
    selectedFilterCat = ""; selectedFilterSub = ""; selectedFilterSp = ""; resetSearchInput(); initFilterSelects();
    filterContainer.style.display = "flex"; 
    filterCatContainer.style.display = ""; 
    filterSubContainer.style.display = ""; 
    filterSpContainer.style.display = "";
    filterBrandContainer.style.display = "none"; 
    filterGearPowerContainer.style.display = "none";
    if (!preserveFilterState) toggleFilterCollapse(false);
    filterModalItems(); showModal();
  }

  function openFavoriteWeaponModal() {
    currentModalContext.type = 'favoriteWeaponList'; modalTitle.innerText = "★ ブキ お気に入り"; resetSearchInput(); initFilterSelects();
    filterContainer.style.display = "flex"; 
    filterCatContainer.style.display = ""; 
    filterSubContainer.style.display = ""; 
    filterSpContainer.style.display = "";
    filterBrandContainer.style.display = "none"; 
    filterGearPowerContainer.style.display = "none";
    backBtn.innerText = "◀ 全一覧"; backBtn.onclick = () => openWeaponCategoryModal(true); backBtn.style.display = "block";
    filterModalItems(); showModal();
  }

  function openRecentWeaponModal() {
    currentModalContext.type = 'recentWeaponList'; modalTitle.innerText = "🕒 選択履歴"; resetSearchInput(); initFilterSelects();
    filterContainer.style.display = "flex"; 
    filterCatContainer.style.display = ""; 
    filterSubContainer.style.display = ""; 
    filterSpContainer.style.display = "";
    filterBrandContainer.style.display = "none"; 
    filterGearPowerContainer.style.display = "none";
    backBtn.innerText = "◀ 全一覧"; backBtn.onclick = () => openWeaponCategoryModal(true); backBtn.style.display = "block";
    filterModalItems(); showModal();
  }

  function openWeaponListModal(categoryIndex) {
    currentModalContext.type = 'weaponList'; currentModalContext.categoryIndex = categoryIndex;
    const selectedCat = weaponCategoryList[categoryIndex]; selectedFilterCat = selectedCat.category;
    modalTitle.innerText = `${selectedCat.category} 一覧`; resetSearchInput(); initFilterSelects();
    filterContainer.style.display = "flex"; 
    filterCatContainer.style.display = ""; 
    filterSubContainer.style.display = ""; 
    filterSpContainer.style.display = "";
    filterBrandContainer.style.display = "none"; 
    filterGearPowerContainer.style.display = "none";
    backBtn.innerText = "◀ カテゴリー"; backBtn.onclick = () => openWeaponCategoryModal(true); backBtn.style.display = "block";
    filterModalItems(); showModal();
  }

  function filterModalItems() {
    if (currentModalContext.type.includes('gear') || currentModalContext.type.includes('Gear') || currentModalContext.type.includes('myGear')) {
      if (currentModalContext.type === 'gearBrand') renderGearBrandView(currentModalContext.part);
      else if (currentModalContext.type === 'favoriteGearList') openFavoriteGearModal(currentModalContext.part, false);
      else if (currentModalContext.type === 'recentGearList') openRecentGearModal(currentModalContext.part, false);
      else if (currentModalContext.type === 'myGearList') openMyGearModal(currentModalContext.part, false);
      else renderGearListItems(currentModalContext.part, currentModalContext.brandIndex);
      return;
    }

    let targetWeapons = [];
    if (currentModalContext.type === 'recentWeaponList') targetWeapons = [...recentWeapons];
    else {
      weaponCategoryList.forEach(cat => {
        if (!selectedFilterCat || cat.category === selectedFilterCat) {
          cat.weapons.forEach(w => {
            if (currentModalContext.type === 'favoriteWeaponList') { if (favoriteWeapons.has(w.name)) targetWeapons.push(w); }
            else targetWeapons.push(w);
          });
        }
      });
    }

    const filtered = targetWeapons.filter(w => {
      const subName = extractNameFromPath(w.subImage), spName = extractNameFromPath(w.spImage);
      return (!selectedFilterSub || subName === selectedFilterSub) &&
             (!selectedFilterSp || spName === selectedFilterSp) &&
             (!searchQueryText || w.name.toLowerCase().includes(searchQueryText));
    });

    renderWeaponGrid(filtered);
  }

  function createWeaponTileHTML(w) {
    const subImg = w.subImage || '', spImg = w.spImage || '';
    const isFav = favoriteWeapons.has(w.name);
    const currentWeaponName = document.getElementById('display-weapon-name')?.innerText;
    const isCurrent = (w.name === currentWeaponName);

    return `
      <div class="grid-item-tile ${isCurrent ? 'selected-current' : ''}" onclick="selectWeapon('${w.name}', '${w.image}', '${subImg}', '${spImg}')">
        <span class="${isFav ? 'fav-star-btn is-fav' : 'fav-star-btn'}" onclick="toggleFavoriteWeapon('${w.name}', event)">${isFav ? '★' : '☆'}</span>
        ${isCurrent ? '<span style="position:absolute; top:2px; left:6px; font-size:0.75rem; color:var(--splat-yellow); font-weight:bold;">✓</span>' : ''}
        <div class="tile-icon"><img src="${w.image}"></div>
        <div class="tile-name">${w.name}</div>
        <div class="tile-sub-sp-row">
          <span class="tile-sub-sp-circle">${subImg ? `<img src="${subImg}">` : "-"}</span>
          <span class="tile-sub-sp-circle">${spImg ? `<img src="${spImg}">` : "-"}</span>
        </div>
      </div>`;
  }

  function renderWeaponGrid(weapons) {
    gridContent.innerHTML = "";
    if (weapons.length === 0) { gridContent.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">該当するブキがありません</div>`; return; }
    setupLazyRender(weapons, createWeaponTileHTML, false);
  }

  function openGearBrandModal(part, preserveFilterState = false) {
    currentModalContext.type = 'gearBrand'; currentModalContext.part = part; resetSearchInput(); initGearPowerFilterBar(part);
    filterContainer.style.display = "flex"; 
    filterCatContainer.style.display = "none"; 
    filterSubContainer.style.display = "none"; 
    filterSpContainer.style.display = "none";
    filterBrandContainer.style.display = ""; 
    filterGearPowerContainer.style.display = "";
    if (!preserveFilterState) toggleFilterCollapse(false);
    const partTitles = { head: "アタマ", clothes: "フク", shoes: "クツ" };
    modalTitle.innerText = `${partTitles[part]} 選択`; backBtn.style.display = "none";
    renderGearBrandView(part); showModal();
  }

  function createGearTileHTML(g) {
    const part = currentModalContext.part; const isFav = favoriteGears.has(g.name);
    const powData = g.isMyGear ? { main: g.main, subs: g.subs } : getGearPowersData(part, g);
    const powersHTML = renderTilePowersHTML(part, powData);
    const currentGearName = document.getElementById(`display-${part}-name`)?.innerText;
    const isCurrent = (g.name === currentGearName);

    if (g.isMyGear) {
      return `
        <div class="grid-item-tile ${isCurrent ? 'selected-current' : ''}" onclick="selectMyGearItem('${part}', '${g.name}', '${g.image}', '${g.main}', '${g.subs[0]}', '${g.subs[1]}', '${g.subs[2]}')">
          <span style="position:absolute; top:4px; right:6px; font-size:0.8rem;" onclick="deleteMyGearItem('${part}', '${g.id}', event)"><span class="tab-icon icon-delete"></span></span>
          ${isCurrent ? '<span style="position:absolute; top:2px; left:6px; font-size:0.75rem; color:var(--splat-yellow); font-weight:bold;">✓</span>' : ''}
          <div class="tile-icon"><img src="${g.image}"></div>
          <div class="tile-name">${g.name}</div>
          ${powersHTML}
        </div>`;
    }

    return `
      <div class="grid-item-tile ${isCurrent ? 'selected-current' : ''}" onclick="selectGear('${part}', '${g.name}', '${g.image}')">
        <span class="${isFav ? 'fav-star-btn is-fav' : 'fav-star-btn'}" onclick="toggleFavoriteGear('${g.name}', event)">${isFav ? '★' : '☆'}</span>
        ${isCurrent ? '<span style="position:absolute; top:2px; left:6px; font-size:0.75rem; color:var(--splat-yellow); font-weight:bold;">✓</span>' : ''}
        <div class="tile-icon"><img src="${g.image}"></div>
        <div class="tile-name">${g.name}</div>
        ${powersHTML}
      </div>`;
  }

  function renderGearBrandView(part) {
    gridContent.innerHTML = "";
    let matchedGears = [];
    if (gearBrandList[part]) {
      gearBrandList[part].forEach(b => {
        if (!selectedFilterBrand || b.brand === selectedFilterBrand) {
          b.items.forEach(g => {
            if (isPowerIncluded(part, g, selectedFilterPower) && (!searchQueryText || g.name.toLowerCase().includes(searchQueryText))) matchedGears.push(g);
          });
        }
      });
    }
    if (matchedGears.length === 0) { gridContent.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">該当するギアがありません</div>`; return; }
    setupLazyRender(matchedGears, createGearTileHTML, false);
  }

  function openMyGearModal(part, resetFilter = true) {
    currentModalContext.type = 'myGearList'; currentModalContext.part = part;
    if (resetFilter) { selectedFilterPower = ""; selectedFilterBrand = ""; resetSearchInput(); }
    initGearPowerFilterBar(part);
    filterContainer.style.display = "flex"; 
    filterCatContainer.style.display = "none"; 
    filterSubContainer.style.display = "none"; 
    filterSpContainer.style.display = "none";
    filterBrandContainer.style.display = ""; 
    filterGearPowerContainer.style.display = "";
    const partTitles = { head: "アタマ", clothes: "フク", shoes: "クツ" };
    modalTitle.innerText = `📦 ${partTitles[part]} マイギア`; gridContent.innerHTML = "";
    backBtn.innerText = "◀ 全一覧"; backBtn.onclick = function() { openGearBrandModal(part, true); }; backBtn.style.display = "block";

    let list = (myGearsList[part] || []).map(g => ({ ...g, isMyGear: true }));
    if (selectedFilterBrand) list = list.filter(g => getGearBrandName(part, g.name) === selectedFilterBrand);
    if (selectedFilterPower) list = list.filter(g => g.main === selectedFilterPower || (g.subs && g.subs.includes(selectedFilterPower)));
    if (searchQueryText) list = list.filter(g => g.name.toLowerCase().includes(searchQueryText));

    if (list.length === 0) {
      gridContent.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">マイギアがありません</div>`;
      showModal(); return;
    }
    setupLazyRender(list, createGearTileHTML, true); showModal();
  }

  function openFavoriteGearModal(part, resetFilter = true) {
    currentModalContext.type = 'favoriteGearList'; currentModalContext.part = part;
    if (resetFilter) { selectedFilterPower = ""; selectedFilterBrand = ""; resetSearchInput(); }
    initGearPowerFilterBar(part);
    filterContainer.style.display = "flex"; 
    filterCatContainer.style.display = "none"; 
    filterSubContainer.style.display = "none"; 
    filterSpContainer.style.display = "none";
    filterBrandContainer.style.display = ""; 
    filterGearPowerContainer.style.display = "";
    const partTitles = { head: "アタマ", clothes: "フク", shoes: "クツ" };
    modalTitle.innerText = `★ ${partTitles[part]} お気に入り`; gridContent.innerHTML = "";
    backBtn.innerText = "◀ 全一覧"; backBtn.onclick = function() { openGearBrandModal(part, true); }; backBtn.style.display = "block";

    let favItems = [];
    if (gearBrandList[part]) {
      gearBrandList[part].forEach(b => {
        if (!selectedFilterBrand || b.brand === selectedFilterBrand) {
          b.items.forEach(g => { if (favoriteGears.has(g.name)) favItems.push(g); });
        }
      });
    }
    if (selectedFilterPower) favItems = favItems.filter(g => isPowerIncluded(part, g, selectedFilterPower));
    if (searchQueryText) favItems = favItems.filter(g => g.name.toLowerCase().includes(searchQueryText));

    if (favItems.length === 0) { gridContent.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">該当するギアがありません</div>`; return; }
    setupLazyRender(favItems, createGearTileHTML, true); showModal();
  }

  function openRecentGearModal(part, resetFilter = true) {
    currentModalContext.type = 'recentGearList'; currentModalContext.part = part;
    if (resetFilter) { selectedFilterPower = ""; selectedFilterBrand = ""; resetSearchInput(); }
    initGearPowerFilterBar(part);
    filterContainer.style.display = "flex"; 
    filterCatContainer.style.display = "none"; 
    filterSubContainer.style.display = "none"; 
    filterSpContainer.style.display = "none";
    filterBrandContainer.style.display = ""; 
    filterGearPowerContainer.style.display = "";
    const partTitles = { head: "アタマ", clothes: "フク", shoes: "クツ" };
    modalTitle.innerText = `🕒 ${partTitles[part]} 選択履歴`; gridContent.innerHTML = "";
    backBtn.innerText = "◀ 全一覧"; backBtn.onclick = function() { openGearBrandModal(part, true); }; backBtn.style.display = "block";

    let list = recentGears[part] || [];
    if (selectedFilterBrand) list = list.filter(g => getGearBrandName(part, g.name) === selectedFilterBrand);
    if (selectedFilterPower) list = list.filter(g => isPowerIncluded(part, g, selectedFilterPower));
    if (searchQueryText) list = list.filter(g => g.name.toLowerCase().includes(searchQueryText));

    if (list.length === 0) { gridContent.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">選択履歴がありません</div>`; return; }
    setupLazyRender(list, createGearTileHTML, true); showModal();
  }

  function getGearPowersData(part, gearObj) {
    if (customGearPowers[gearObj.name]) return customGearPowers[gearObj.name];
    return { main: gearObj.defaultMain || "未選択", subs: gearObj.defaultSubs || ["-", "-", "-"] };
  }

  function renderTilePowersHTML(part, powerData) {
    const mainImg = getPowerImagePath(part, powerData.main);
    const mainHTML = mainImg ? `<img src="${mainImg}">` : "?";
    let subsHTML = "";
    for (let i = 0; i < 3; i++) {
      const subName = powerData.subs[i] || "-";
      const subImg = getPowerImagePath(part, subName);
      subsHTML += `<span class="tile-power-circle sub">${subImg ? `<img src="${subImg}">` : "-"}</span>`;
    }
    return `<div class="tile-powers-row"><span class="tile-power-circle main">${mainHTML}</span>${subsHTML}</div>`;
  }

  function isPowerIncluded(part, gearObj, targetPower) {
    if (!targetPower) return true;
    const powData = getGearPowersData(part, gearObj);
    return powData.main === targetPower || (powData.subs && powData.subs.includes(targetPower));
  }

  function renderGearListItems(part, brandIndex) {
    const selectedBrand = gearBrandList[part][brandIndex]; gridContent.innerHTML = "";
    if (!selectedBrand.items || selectedBrand.items.length === 0) { gridContent.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">該当するギアがありません</div>`; return; }
    let filteredItems = selectedBrand.items;
    if (selectedFilterPower) filteredItems = filteredItems.filter(g => isPowerIncluded(part, g, selectedFilterPower));
    if (searchQueryText) filteredItems = filteredItems.filter(g => g.name.toLowerCase().includes(searchQueryText));
    if (filteredItems.length === 0) { gridContent.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">該当するギアがありません</div>`; return; }
    setupLazyRender(filteredItems, createGearTileHTML, true);
  }

  function openPowerModal(part, slotType) {
    currentModalContext.type = 'power';
    currentModalContext.part = part;
    currentModalContext.slotType = slotType;
    modalTitle.innerText = slotType === 'main' ? "メインギアパワー" : "サブギアパワー";
    filterContainer.style.display = "none"; gridContent.innerHTML = ""; backBtn.style.display = "none";
    let availablePowers = slotType === 'main' ? [...gearListLeft[part], ...gearListNormal] : [...gearListNormal];
    
    const currentPowerName = document.getElementById(`${part}-${slotType}`)?.getAttribute('data-name');

    const renderPowerTile = (p) => {
      const isCurrent = (p.name === currentPowerName);
      return `
        <div class="grid-item-tile ${isCurrent ? 'selected-current' : ''}" onclick="selectPower('${part}', '${slotType}', '${p.name}', '${p.image}')">
          ${isCurrent ? '<span style="position:absolute; top:2px; left:6px; font-size:0.75rem; color:var(--splat-yellow); font-weight:bold;">✓</span>' : ''}
          <div class="tile-icon"><img src="${p.image}"></div>
          <div class="tile-name">${p.name}</div>
        </div>`;
    };
    setupLazyRender(availablePowers, renderPowerTile, true); showModal();
  }

  function selectWeapon(name, imagePath, subImagePath = "", spImagePath = "") {
    const slot = document.getElementById('slot-weapon');
    slot.setAttribute('data-name', name); slot.setAttribute('data-sub-image', subImagePath || ""); slot.setAttribute('data-sp-image', spImagePath || "");
    const nameEl = document.getElementById('display-weapon-name'); nameEl.innerText = name;
    const subEl = document.getElementById('display-weapon-sub'); const spEl = document.getElementById('display-weapon-sp');

    if (name === "未選択" || !imagePath) {
      document.getElementById('display-weapon-icon').innerText = "＋";
      nameEl.classList.remove('active-selection'); subEl.innerHTML = "-"; spEl.innerHTML = "-";
    } else {
      document.getElementById('display-weapon-icon').innerHTML = `<img src="${imagePath}" style="width:100%;height:100%;object-fit:contain;">`;
      nameEl.classList.add('active-selection');
      subEl.innerHTML = subImagePath ? `<img src="${subImagePath}" style="width:100%;height:100%;object-fit:contain;">` : "-";
      spEl.innerHTML = spImagePath ? `<img src="${spImagePath}" style="width:100%;height:100%;object-fit:contain;">` : "-";
      pushRecentWeapon({ name, image: imagePath, subImage: subImagePath, spImage: spImagePath });
    }
    markAsDirty();
    closeModal();
  }

  function clearWeaponPart(event) { if (event) event.stopPropagation(); selectWeapon('未選択', ''); }
  function clearGearPart(part, event) {
    if (event) event.stopPropagation();
    selectGear(part, '未選択', '', false);
    selectPower(part, 'main', '未選択', '', false);
    ['sub0', 'sub1', 'sub2'].forEach(slot => selectPower(part, slot, '-', '', false));
    calculateAndRenderGearTotals();
    markAsDirty();
  }

  function clearMemoText(event) {
    if (event) event.stopPropagation();
    const memoInput = document.getElementById('input-memo');
    if (memoInput) memoInput.value = "";
    markAsDirty();
  }

  function selectMyGearItem(part, name, imagePath, mainPower, sub0, sub1, sub2) {
    selectGear(part, name, imagePath, false);
    const foundMain = [...gearListNormal, ...gearListLeft[part]].find(p => p.name === mainPower);
    selectPower(part, 'main', mainPower, foundMain ? foundMain.image : "", false);
    [sub0, sub1, sub2].forEach((sName, idx) => {
      const foundSub = gearListNormal.find(p => p.name === sName);
      selectPower(part, `sub${idx}`, sName, foundSub ? foundSub.image : "", false);
    });
    markAsDirty();
    closeModal(); calculateAndRenderGearTotals();
  }

  function selectGear(part, name, imagePath, autoLoadCustom = true) {
    const slot = document.getElementById(`slot-${part}`);
    slot.setAttribute('data-name', name);
    const nameEl = document.getElementById(`display-${part}-name`); nameEl.innerText = name;
    
    if (name === "未選択" || !imagePath) {
      document.getElementById(`display-${part}-icon`).innerText = "＋";
      nameEl.classList.remove('active-selection');
    } else {
      document.getElementById(`display-${part}-icon`).innerHTML = `<img src="${imagePath}" style="width:100%;height:100%;object-fit:contain;">`;
      nameEl.classList.add('active-selection');
      pushRecentGear(part, { name, image: imagePath });
    }

    if (autoLoadCustom) {
      const currentMainName = document.getElementById(`${part}-main`)?.getAttribute('data-name');
      const currentSub0Name = document.getElementById(`${part}-sub0`)?.getAttribute('data-name');
      const currentSub1Name = document.getElementById(`${part}-sub1`)?.getAttribute('data-name');
      const currentSub2Name = document.getElementById(`${part}-sub2`)?.getAttribute('data-name');

      const hasExistingMain = currentMainName && currentMainName !== "未選択" && currentMainName !== "?";
      const hasExistingSubs = (currentSub0Name && currentSub0Name !== "未選択" && currentSub0Name !== "-") ||
                              (currentSub1Name && currentSub1Name !== "未選択" && currentSub1Name !== "-") ||
                              (currentSub2Name && currentSub2Name !== "未選択" && currentSub2Name !== "-");

      if (!hasExistingMain && !hasExistingSubs) {
        let defaultMain = "", defaultSubs = ["-", "-", "-"];
        if (gearBrandList[part]) {
          for (let b of gearBrandList[part]) {
            let item = b.items.find(i => i.name === name);
            if (item) { defaultMain = item.defaultMain || ""; defaultSubs = item.defaultSubs || ["-", "-", "-"]; break; }
          }
        }
        const savedPow = customGearPowers[name] || { main: defaultMain, subs: defaultSubs };
        if (savedPow.main) {
          const foundMain = [...gearListNormal, ...gearListLeft[part]].find(p => p.name === savedPow.main);
          selectPower(part, 'main', savedPow.main, foundMain ? foundMain.image : "", false);
        } else selectPower(part, 'main', '未選択', '', false);

        for (let i = 0; i < 3; i++) {
          const sName = (savedPow.subs && savedPow.subs[i]) ? savedPow.subs[i] : "-";
          const foundSub = gearListNormal.find(p => p.name === sName);
          selectPower(part, `sub${i}`, sName, foundSub ? foundSub.image : "", false);
        }
      }
    }
    markAsDirty();
    closeModal(); calculateAndRenderGearTotals();
  }

  function selectPower(part, slotType, name, imagePath, shouldSave = true) {
    const targetSlot = document.getElementById(`${part}-${slotType}`);
    targetSlot.setAttribute('data-name', name);
    if (name === "未選択" || name === "-" || !imagePath) {
      targetSlot.innerHTML = "";
      targetSlot.innerText = "＋";
    } else {
      targetSlot.innerHTML = `<img src="${imagePath}" style="width:100%;height:100%;object-fit:contain;">`;
    }
    targetSlot.title = name;

    if (shouldSave) {
      const currentGearName = document.getElementById(`slot-${part}`)?.getAttribute('data-name');
      if (currentGearName && currentGearName !== '未選択') saveCustomGearPower(part, currentGearName);
    }
    markAsDirty();
    closeModal(); calculateAndRenderGearTotals();
  }

  function clearCurrentEditor() {
    selectWeapon('未選択', '');
    ['head', 'clothes', 'shoes'].forEach(part => { 
      selectGear(part, '未選択', '', false);
      selectPower(part, 'main', '未選択', '', false);
      ['sub0', 'sub1', 'sub2'].forEach(slot => selectPower(part, slot, '-', '', false));
    });
    updateSens('gyro', "0.0"); updateSens('stick', "0.0");
    document.getElementById('input-memo').value = "";
    calculateAndRenderGearTotals();
    markAsClean();
    updateQuickBarUI();
  }

  function resetCurrent編成() {
    if (confirm("⚠️ 編成をリセットしますか？")) {
      backupCurrentEditorState(); clearCurrentEditor();
      currentActiveSlotKey = ""; localStorage.removeItem(STORAGE_KEY_ACTIVE);
      renderVisualSlots();
      updateQuickBarUI();
      showToast("クリアしました", "icon-reset");
    }
  }

  function saveCustomGearPower(part, gearName) {
    const mainName = document.getElementById(`${part}-main`)?.getAttribute('data-name') || "未選択";
    const sub0 = document.getElementById(`${part}-sub0`)?.getAttribute('data-name') || "-";
    const sub1 = document.getElementById(`${part}-sub1`)?.getAttribute('data-name') || "-";
    const sub2 = document.getElementById(`${part}-sub2`)?.getAttribute('data-name') || "-";
    customGearPowers[gearName] = { main: mainName, subs: [sub0, sub1, sub2] };
    localStorage.setItem(STORAGE_KEY_CUSTOM_GEAR_POWERS, JSON.stringify(customGearPowers));
  }

  function calculateAndRenderGearTotals() {
    const totalsContainer = document.getElementById('gear-totals-wrapper');
    if (!totalsContainer) return;
    const parts = ['head', 'clothes', 'shoes']; const powerMap = {};
    const clothesMainEl = document.getElementById('clothes-main');
    const isDoubled = clothesMainEl && clothesMainEl.getAttribute('data-name') === '倍化';

    parts.forEach(part => {
      const mainEl = document.getElementById(`${part}-main`);
      if (mainEl) {
        const mName = mainEl.getAttribute('data-name');
        const mImg = mainEl.querySelector('img')?.getAttribute('src');
        if (mName && mName !== '未選択' && mName !== '?' && mImg) {
          if (!powerMap[mName]) powerMap[mName] = { total: 0, image: mImg };
          powerMap[mName].total += 1.0;
        }
      }
      for (let i = 0; i < 3; i++) {
        const subEl = document.getElementById(`${part}-sub${i}`);
        if (subEl) {
          const sName = subEl.getAttribute('data-name');
          const sImg = subEl.querySelector('img')?.getAttribute('src');
          if (sName && sName !== '未選択' && sName !== '-' && sImg) {
            if (!powerMap[sName]) powerMap[sName] = { total: 0, image: sImg };
            powerMap[sName].total += (part === 'clothes' && isDoubled) ? 0.6 : 0.3;
          }
        }
      }
    });

    const powerNames = Object.keys(powerMap);
    if (powerNames.length === 0) { totalsContainer.innerHTML = `<span class="empty-totals-msg">未選択</span>`; return; }
    let html = '';
    powerNames.forEach(pName => {
      const item = powerMap[pName];
      const formattedValue = (Math.round(item.total * 10) / 10).toFixed(1);
      html += `<div class="gear-total-item" title="${pName}: ${formattedValue}"><div class="gear-total-icon"><img src="${item.image}" style="width:100%;height:100%;"></div><div class="gear-total-value">${formattedValue}</div></div>`;
    });
    totalsContainer.innerHTML = html;
  }

  function exportAsImage() {
    const target = document.getElementById('capture-target'); if (!target) return;
    const btn = document.querySelector('.export-img-btn'); const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = "<span class='tab-icon icon-camera'></span> 生成中...";

    document.fonts.ready.then(() => {
      const clone = target.cloneNode(true);
      clone.style.width = '850px'; 
      clone.style.position = 'fixed'; 
      clone.style.left = '-9999px'; 
      clone.style.top = '0px'; 
      clone.style.zIndex = '-9999';

      const grid = clone.querySelector('.coord-grid');
      if (grid) {
        grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
        grid.style.gap = '14px';
      }
      const cards = clone.querySelectorAll('.slot-card');
      cards.forEach(card => {
        card.style.display = 'block';
        card.style.padding = '14px 10px';
      });
      const slots = clone.querySelectorAll('.clickable-slot');
      slots.forEach(slot => {
        slot.style.display = 'block';
        slot.style.width = 'auto';
      });
      const mygearBtns = clone.querySelectorAll('.save-mygear-btn');
      mygearBtns.forEach(b => {
        b.style.display = 'block';
        b.style.width = '100%';
      });

      document.body.appendChild(clone);

      const images = Array.from(clone.querySelectorAll('img'));
      const imagePromises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });

      Promise.all(imagePromises).then(() => {
        const computedBg = getComputedStyle(document.body).backgroundColor;

        html2canvas(clone, { backgroundColor: computedBg, scale: 2, useCORS: true, logging: false }).then(canvas => {
          document.body.removeChild(clone);
          const fileName = `${slotNames[currentActiveSlotKey] || 'マイコーデ'}.png`;
          const link = document.createElement('a'); link.download = fileName; link.href = canvas.toDataURL('image/png'); link.click();
          if (btn) btn.innerHTML = originalText;
          showToast("画像を保存しました", "icon-camera");
        }).catch(err => {
          if (document.body.contains(clone)) document.body.removeChild(clone);
          showToast("保存に失敗しました", "icon-fail");
          if (btn) btn.innerHTML = originalText;
        });
      });
    });
  }

  function downloadJSONFile(dataObject, filename) {
    const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObject, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", jsonString);
    anchor.setAttribute("download", filename);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function exportDataAsJSON() {
    const exportDataObject = {
      version: "v12_complete",
      exportedAt: new Date().toISOString(),
      slotNames,
      slotsData,
      favoriteGears: [...favoriteGears],
      favoriteWeapons: [...favoriteWeapons],
      customGearPowers,
      myGearsList,
      recentWeapons,
      recentGears,
      customGlobalTags: getCustomGlobalTags(),
      memberPresets: getPresets(),
      weaponPresets: getWeaponPresets(),
      activeWeapons: activeWeapons,
      teamConstraints: teamConstraints,
      theme: localStorage.getItem(STORAGE_KEY_THEME) || 'dark'
    };

    downloadJSONFile(exportDataObject, `spla3_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
    showToast("全体バックアップを保存しました", "icon-export");
  }

  function importDataFromJSON() {
    document.getElementById('json-file-input')?.click();
  }
  
  function handleJSONFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedData = JSON.parse(e.target.result);
        if (!importedData || (!importedData.slotNames && !importedData.memberPresets)) {
          showToast("無効なデータです", "icon-fail");
          return;
        }
        if (confirm("⚠️ 既存の全データが上書きされます。続行しますか？")) {
          if (importedData.slotNames) slotNames = importedData.slotNames;
          if (importedData.slotsData) slotsData = importedData.slotsData;
          if (importedData.favoriteGears) favoriteGears = new Set(importedData.favoriteGears);
          if (importedData.favoriteWeapons) favoriteWeapons = new Set(importedData.favoriteWeapons);
          if (importedData.customGearPowers) customGearPowers = importedData.customGearPowers;
          if (importedData.myGearsList) myGearsList = importedData.myGearsList;
          if (importedData.recentWeapons) recentWeapons = importedData.recentWeapons;
          if (importedData.recentGears) recentGears = importedData.recentGears;
          if (importedData.customGlobalTags) saveCustomGlobalTags(importedData.customGlobalTags);
          if (importedData.teamConstraints) { teamConstraints = importedData.teamConstraints; saveTeamConstraints(); }

          saveAllToStorage();
          localStorage.setItem(STORAGE_KEY_FAV_GEARS, JSON.stringify([...favoriteGears]));
          localStorage.setItem(STORAGE_KEY_FAV_WEAPONS, JSON.stringify([...favoriteWeapons]));
          localStorage.setItem(STORAGE_KEY_CUSTOM_GEAR_POWERS, JSON.stringify(customGearPowers));
          localStorage.setItem(STORAGE_KEY_MY_GEARS, JSON.stringify(myGearsList));
          localStorage.setItem(STORAGE_KEY_RECENT_WEAPONS, JSON.stringify(recentWeapons));
          localStorage.setItem(STORAGE_KEY_RECENT_GEARS, JSON.stringify(recentGears));

          if (importedData.memberPresets) { savePresets(importedData.memberPresets); updatePresetDropdown(); }
          if (importedData.weaponPresets) { saveWeaponPresets(importedData.weaponPresets); updateWeaponPresetDropdown(); }
          if (importedData.activeWeapons) {
            activeWeapons = importedData.activeWeapons;
            localStorage.setItem(STORAGE_KEY_WEAPONS, JSON.stringify(activeWeapons));
            updateWeaponCountUI();
          }

          if (importedData.theme) {
            applyTheme(importedData.theme);
            localStorage.setItem(STORAGE_KEY_THEME, importedData.theme);
          }

          renderTagFilterBar();
          const firstKey = Object.keys(slotNames)[0];
          if (firstKey) switchSlot(firstKey); else { renderVisualSlots(); clearCurrentEditor(); }

          updateHomeDashboardStats();
          showToast("バックアップを復元しました！", "icon-import");
        }
      } catch (err) {
        showToast("読み込み失敗", "icon-fail");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function exportEditorDataAsJSON() {
    const dataObj = {
      type: "spla3_editor_backup",
      exportedAt: new Date().toISOString(),
      slotNames,
      slotsData,
      favoriteGears: [...favoriteGears],
      favoriteWeapons: [...favoriteWeapons],
      customGearPowers,
      myGearsList,
      recentWeapons,
      recentGears,
      customGlobalTags: getCustomGlobalTags()
    };

    downloadJSONFile(dataObj, `spla3_mycode_backup_${new Date().toISOString().slice(0, 10)}.json`);
    showToast("マイコーデのバックアップを保存しました", "icon-clothes");
  }

  function importEditorDataFromJSON() {
    document.getElementById('json-editor-file-input')?.click();
  }

  function handleEditorJSONFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || (!data.slotNames && !data.slotsData)) {
          showToast("マイコーデのデータが見つかりません", "icon-fail");
          return;
        }
        if (confirm("⚠️ マイコーデのデータを上書き復元しますか？")) {
          if (data.slotNames) slotNames = data.slotNames;
          if (data.slotsData) slotsData = data.slotsData;
          if (data.favoriteGears) favoriteGears = new Set(data.favoriteGears);
          if (data.favoriteWeapons) favoriteWeapons = new Set(data.favoriteWeapons);
          if (data.customGearPowers) customGearPowers = data.customGearPowers;
          if (data.myGearsList) myGearsList = data.myGearsList;
          if (data.recentWeapons) recentWeapons = data.recentWeapons;
          if (data.recentGears) recentGears = data.recentGears;
          if (data.customGlobalTags) saveCustomGlobalTags(data.customGlobalTags);

          saveAllToStorage();
          localStorage.setItem(STORAGE_KEY_FAV_GEARS, JSON.stringify([...favoriteGears]));
          localStorage.setItem(STORAGE_KEY_FAV_WEAPONS, JSON.stringify([...favoriteWeapons]));
          localStorage.setItem(STORAGE_KEY_CUSTOM_GEAR_POWERS, JSON.stringify(customGearPowers));
          localStorage.setItem(STORAGE_KEY_MY_GEARS, JSON.stringify(myGearsList));
          localStorage.setItem(STORAGE_KEY_RECENT_WEAPONS, JSON.stringify(recentWeapons));
          localStorage.setItem(STORAGE_KEY_RECENT_GEARS, JSON.stringify(recentGears));

          renderTagFilterBar();
          const firstKey = Object.keys(slotNames)[0];
          if (firstKey) switchSlot(firstKey); else { renderVisualSlots(); clearCurrentEditor(); }
          updateHomeDashboardStats();
          showToast("マイコーデを復元しました！", "icon-import");
        }
      } catch (err) {
        showToast("読み込み失敗", "icon-fail");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function exportTeamDataAsJSON() {
    const dataObj = {
      type: "spla3_team_backup",
      exportedAt: new Date().toISOString(),
      memberPresets: getPresets(),
      weaponPresets: getWeaponPresets(),
      activeWeapons: activeWeapons,
      teamConstraints: teamConstraints
    };

    downloadJSONFile(dataObj, `spla3_team_backup_${new Date().toISOString().slice(0, 10)}.json`);
    showToast("チーム設定のバックアップを保存しました", "icon-dice");
  }

  function importTeamDataAsJSON() {
    document.getElementById('json-team-file-input')?.click();
  }

  function handleTeamJSONFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || (!data.memberPresets && !data.weaponPresets && !data.activeWeapons)) {
          showToast("チームメーカーのデータが見つかりません", "icon-fail");
          return;
        }
        if (confirm("⚠️ チーム設定のデータを上書き復元しますか？")) {
          if (data.memberPresets) { savePresets(data.memberPresets); updatePresetDropdown(); }
          if (data.weaponPresets) { saveWeaponPresets(data.weaponPresets); updateWeaponPresetDropdown(); }
          if (data.activeWeapons) { activeWeapons = data.activeWeapons; localStorage.setItem(STORAGE_KEY_WEAPONS, JSON.stringify(activeWeapons)); updateWeaponCountUI(); }
          if (data.teamConstraints) { teamConstraints = data.teamConstraints; saveTeamConstraints(); }

          updateHomeDashboardStats();
          showToast("チーム設定を復元しました！", "icon-import");
        }
      } catch (err) {
        showToast("読み込み失敗", "icon-fail");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function initSensMeters() {
    ['gyro', 'stick'].forEach(type => {
      const container = document.getElementById(`blocks-${type}`); container.innerHTML = "";
      for (let i = 0; i < 21; i++) {
        const block = document.createElement('div'); block.className = 'sens-block'; block.id = `block-${type}-${i}`; container.appendChild(block);
      }
    });
  }

  function updateSens(type, value) {
    let numVal = parseFloat(value); if (isNaN(numVal)) numVal = 0.0;
    numVal = Math.max(-5.0, Math.min(5.0, numVal));
    const rangeInput = document.getElementById(`input-${type}`); if (rangeInput) rangeInput.value = numVal;
    document.getElementById(`val-${type}`).innerText = numVal > 0 ? `+${numVal.toFixed(1)}` : numVal.toFixed(1);
    const activeIndex = Math.round((numVal + 5.0) / 0.5);
    for (let i = 0; i < 21; i++) {
      const block = document.getElementById(`block-${type}-${i}`);
      if (block) { if (i <= activeIndex) block.classList.add('active'); else block.classList.remove('active'); }
    }
  }

  function adjustSensStep(type, delta) {
    const rangeInput = document.getElementById(`input-${type}`);
    if (rangeInput) {
      updateSens(type, (parseFloat(rangeInput.value) || 0.0) + delta);
      markAsDirty();
    }
  }

  const STORAGE_KEY_SLOTS = 'spla3_closet_slots_dict_v7';
  const STORAGE_KEY_NAMES = 'spla3_closet_slot_names_v7';
  const STORAGE_KEY_ACTIVE = 'spla3_closet_active_key_v7';
  
  let currentActiveSlotKey = "";
  let slotNames = { "slot1": "コーデ1" };
  let slotsData = {};

  const defaultLayout = {
    weapon: { name: "未選択", image: "", subImage: "", spImage: "" },
    gear: {
      head: { name: "未選択", image: "", main: { name: "未選択", image: "" }, sub0: { name: "未選択", image: "" }, sub1: { name: "未選択", image: "" }, sub2: { name: "未選択", image: "" } },
      clothes: { name: "未選択", image: "", main: { name: "未選択", image: "" }, sub0: { name: "未選択", image: "" }, sub1: { name: "未選択", image: "" }, sub2: { name: "未選択", image: "" } },
      shoes: { name: "未選択", image: "", main: { name: "未選択", image: "" }, sub0: { name: "未選択", image: "" }, sub1: { name: "未選択", image: "" }, sub2: { name: "未選択", image: "" } }
    },
    sensitivity: { gyro: "0.0", stick: "0.0" }, memo: "", tags: []
  };

  let activeTagFilters = new Set();
  const DEFAULT_TAG_PRESETS = ["ガチエリア", "ガチヤグラ", "ガチホコ", "ガチアサリ", "ナワバリ"];
  let editingTagSlotKey = null;

  function getCustomGlobalTags() {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_TAGS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch(e) { return []; }
  }

  function saveCustomGlobalTags(tags) {
    localStorage.setItem(STORAGE_KEY_CUSTOM_TAGS, JSON.stringify(tags));
  }

  function getAllKnownTags() {
    const tagSet = new Set(DEFAULT_TAG_PRESETS);
    getCustomGlobalTags().forEach(t => tagSet.add(t));
    Object.values(slotsData).forEach(s => {
      if (s.tags && Array.isArray(s.tags)) {
        s.tags.forEach(t => { if (t) tagSet.add(t); });
      }
    });
    return Array.from(tagSet);
  }

  function renderTagFilterBar() {
    const wrapper = document.getElementById('tag-filter-wrapper');
    if (!wrapper) return;
    
    const tags = getAllKnownTags();
    let html = `<button class="tag-filter-chip ${activeTagFilters.size === 0 ? 'active' : ''}" onclick="filterSlotsByTag('')">ALL</button>`;
    tags.forEach(tag => {
      const isSelected = activeTagFilters.has(tag);
      html += `<button class="tag-filter-chip ${isSelected ? 'active' : ''}" onclick="filterSlotsByTag('${tag}')">#${tag}</button>`;
    });
    wrapper.innerHTML = html;
  }

  function filterSlotsByTag(tag) {
    if (tag === '') {
      activeTagFilters.clear();
    } else {
      if (activeTagFilters.has(tag)) {
        activeTagFilters.delete(tag);
      } else {
        activeTagFilters.add(tag);
      }
    }
    renderTagFilterBar();
    renderVisualSlots();
  }

  function openTagManagerModal() {
    const container = document.getElementById('tag-manager-list-wrapper');
    if (!container) return;

    const allTags = getAllKnownTags();
    container.innerHTML = allTags.map(tag => {
      const isDefault = DEFAULT_TAG_PRESETS.includes(tag);
      return `<div class="tag-option-chip selected" style="display:inline-flex; align-items:center; gap:6px;">
        <span>#${tag}</span>
        ${!isDefault ? `<span class="tag-delete-x" onclick="deleteGlobalTag('${tag}')" title="削除">✕</span>` : ''}
      </div>`;
    }).join('');

    document.getElementById('manager-new-tag-input').value = "";
    document.getElementById('tag-manager-modal').classList.add('active');
    
    scrollPositionBeforeModal = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${scrollPositionBeforeModal}px`;
    document.body.classList.add('modal-open');
  }

  function closeTagManagerModal(event) {
    if (event && event.target !== document.getElementById('tag-manager-modal')) return;
    document.getElementById('tag-manager-modal').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPositionBeforeModal);
  }

  function addNewTagGlobally() {
    const input = document.getElementById('manager-new-tag-input');
    const val = input.value.trim().replace(/^#/, '');
    if (!val) return;

    const customTags = getCustomGlobalTags();
    if (!DEFAULT_TAG_PRESETS.includes(val) && !customTags.includes(val)) {
      customTags.push(val);
      saveCustomGlobalTags(customTags);
      renderTagFilterBar();
      openTagManagerModal();
      input.value = "";
      showToast(`🏷️ タグ「#${val}」を追加しました`);
    } else {
      showToast("既に存在するタグです", "icon-note");
    }
  }

  function deleteGlobalTag(tagToDelete) {
    if (confirm(`タグ「#${tagToDelete}」を削除しますか？`)) {
      let customTags = getCustomGlobalTags().filter(t => t !== tagToDelete);
      saveCustomGlobalTags(customTags);

      Object.values(slotsData).forEach(s => {
        if (s.tags && Array.isArray(s.tags)) {
          s.tags = s.tags.filter(t => t !== tagToDelete);
        }
      });
      saveAllToStorage();

      activeTagFilters.delete(tagToDelete);
      renderTagFilterBar();
      renderVisualSlots();
      openTagManagerModal();
      showToast("タグを削除しました", "icon-delete");
    }
  }

  function openTagModal(slotKey, event) {
    if (event) event.stopPropagation();
    editingTagSlotKey = slotKey;
    const titleEl = document.getElementById('tag-modal-title');
    if (titleEl) titleEl.innerHTML = `<span class="tab-icon icon-tag"></span> 「${slotNames[slotKey] || 'コーデ'}」のタグ設定`;

    renderTagModalOptions();

    document.getElementById('custom-tag-input').value = "";
    document.getElementById('tag-edit-modal').classList.add('active');
    
    scrollPositionBeforeModal = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${scrollPositionBeforeModal}px`;
    document.body.classList.add('modal-open');
  }

  function renderTagModalOptions() {
    if (!editingTagSlotKey) return;
    const currentTags = (slotsData[editingTagSlotKey] && slotsData[editingTagSlotKey].tags) ? slotsData[editingTagSlotKey].tags : [];
    const allTags = getAllKnownTags();
    const container = document.getElementById('tag-options-wrapper');
    if (!container) return;

    container.innerHTML = allTags.map(tag => {
      const isSelected = currentTags.includes(tag);
      return `<div class="tag-option-chip ${isSelected ? 'selected' : ''}" onclick="toggleTagOptionDirect('${tag}')">#${tag}</div>`;
    }).join('');
  }

  function toggleTagOptionDirect(tag) {
    if (!editingTagSlotKey) return;
    if (!slotsData[editingTagSlotKey]) {
      slotsData[editingTagSlotKey] = JSON.parse(JSON.stringify(defaultLayout));
    }
    if (!slotsData[editingTagSlotKey].tags) {
      slotsData[editingTagSlotKey].tags = [];
    }

    const tags = slotsData[editingTagSlotKey].tags;
    const index = tags.indexOf(tag);

    if (index > -1) {
      tags.splice(index, 1);
    } else {
      tags.push(tag);
    }

    saveAllToStorage();
    renderTagFilterBar();
    renderVisualSlots();
    renderTagModalOptions();
  }

  function addCustomTagFromModal() {
    const input = document.getElementById('custom-tag-input');
    const val = input.value.trim().replace(/^#/, '');
    if (!val) return;

    let customTags = getCustomGlobalTags();
    if (!DEFAULT_TAG_PRESETS.includes(val) && !customTags.includes(val)) {
      customTags.push(val);
      saveCustomGlobalTags(customTags);
    }

    const container = document.getElementById('tag-options-wrapper');
    const existing = Array.from(container.querySelectorAll('.tag-option-chip')).find(el => el.innerText === `#${val}`);
    if (existing) {
      existing.classList.add('selected');
    } else {
      const newChip = document.createElement('div');
      newChip.className = 'tag-option-chip selected';
      newChip.innerText = `#${val}`;
      newChip.onclick = function() { toggleTagOption(this, val); };
      container.appendChild(newChip);
    }
    input.value = "";
    renderTagFilterBar();
  }

  function saveTagModalSelection() {
    if (!editingTagSlotKey) return;
    const container = document.getElementById('tag-options-wrapper');
    const selectedTags = Array.from(container.querySelectorAll('.tag-option-chip.selected'))
      .map(el => el.innerText.replace(/^#/, ''));

    if (!slotsData[editingTagSlotKey]) slotsData[editingTagSlotKey] = JSON.parse(JSON.stringify(defaultLayout));
    slotsData[editingTagSlotKey].tags = selectedTags;

    saveAllToStorage();
    renderTagFilterBar();
    renderVisualSlots();
    closeTagModal();
    showToast("タグを更新しました", "icon-tag");
  }

  function closeTagModal(event) {
    if (event && event.target !== document.getElementById('tag-edit-modal')) return;
    document.getElementById('tag-edit-modal').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPositionBeforeModal);
    editingTagSlotKey = null;
  }

  function openTagDetailModal(slotKey, event) {
    if (event) event.stopPropagation();
    const data = slotsData[slotKey];
    if (!data || !data.tags || data.tags.length === 0) return;

    const titleEl = document.getElementById('tag-detail-title');
    if (titleEl) titleEl.innerHTML = `<span class="tab-icon icon-tag"></span> 「${slotNames[slotKey]}」のタグ (${data.tags.length}件)`;

    const listEl = document.getElementById('tag-detail-list');
    listEl.innerHTML = data.tags.map(t => `<span class="slot-tag-badge" style="font-size:0.75rem; padding:3px 8px;">#${t}</span>`).join('');

    document.getElementById('tag-detail-modal').classList.add('active');
    scrollPositionBeforeModal = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${scrollPositionBeforeModal}px`;
    document.body.classList.add('modal-open');
  }

  function closeTagDetailModal(event) {
    if (event && event.target !== document.getElementById('tag-detail-modal')) return;
    document.getElementById('tag-detail-modal').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPositionBeforeModal);
  }

  function initSlotSystem() {
    initTheme(); loadFavorites(); initSensMeters(); initModalScrollListener(); initDragAndDrop(); initCarousel();
    const savedNames = localStorage.getItem(STORAGE_KEY_NAMES), savedSlots = localStorage.getItem(STORAGE_KEY_SLOTS);
    if (savedNames) slotNames = JSON.parse(savedNames);
    if (savedSlots) slotsData = JSON.parse(savedSlots);
    
    const keys = Object.keys(slotNames);
    if (keys.length === 0) slotNames["slot1"] = "コーデ1";
    
    Object.keys(slotNames).forEach(k => { 
      if (!slotsData[k]) slotsData[k] = JSON.parse(JSON.stringify(defaultLayout)); 
      if (!slotsData[k].tags) slotsData[k].tags = [];
    });

    const savedActiveKey = localStorage.getItem(STORAGE_KEY_ACTIVE);
    const validKeys = Object.keys(slotNames);
    const defaultKey = (savedActiveKey && slotNames[savedActiveKey]) ? savedActiveKey : (validKeys[0] || "");

    renderTagFilterBar();

    if (defaultKey) {
      currentActiveSlotKey = defaultKey;
      localStorage.setItem(STORAGE_KEY_ACTIVE, defaultKey);
      renderVisualSlots();
      applySlotData(defaultKey);
    } else {
      currentActiveSlotKey = "";
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
      renderVisualSlots();
      clearCurrentEditor();
    }

    updateHomeDashboardStats();
    updateQuickBarUI();
    markAsClean();
  }

  function addNewSlot() {
    const newKey = "slot_" + Date.now();
    slotNames[newKey] = `コーデ${Object.keys(slotNames).length + 1}`;
    slotsData[newKey] = JSON.parse(JSON.stringify(defaultLayout));
    saveAllToStorage(); 
    renderTagFilterBar();
    switchSlot(newKey);
    updateHomeDashboardStats();
    showToast("コーデを追加しました", "icon-add");
  }

  function renderImgOrText(dataObj, defaultChar = "?") {
    if (!dataObj || dataObj.name === "未選択" || dataObj.name === "-" || !dataObj.image) return defaultChar;
    return `<img src="${dataObj.image}" style="width:100%;height:100%;object-fit:contain;">`;
  }

  /* マイコーデプレビュー（ブキ＋メインギア3種アイコン）表示レンダラー */
  function renderVisualSlots() {
    const wrapper = document.getElementById('slots-wrapper'); wrapper.innerHTML = "";
    const keys = Object.keys(slotNames);

    keys.forEach((key) => {
      const data = slotsData[key] || defaultLayout;
      const tags = data.tags || [];

      if (activeTagFilters.size > 0) {
        let matchAll = true;
        for (let t of activeTagFilters) {
          if (!tags.includes(t)) { matchAll = false; break; }
        }
        if (!matchAll) return;
      }

      const card = document.createElement('div');
      card.className = `visual-slot-card ${key === currentActiveSlotKey ? 'active' : ''}`;
      card.id = `vcard-${key}`; 
      card.setAttribute('data-key', key);
      card.setAttribute('draggable', 'true');
      card.setAttribute('onclick', `switchSlot('${key}')`);

      let tagsHTML = '';
      if (tags.length > 0) {
        const visibleTags = tags.slice(0, 2);
        const remainingCount = tags.length - 2;
        tagsHTML = `<div class="slot-tag-list">` +
          visibleTags.map(t => `<span class="slot-tag-badge">#${t}</span>`).join('') +
          (remainingCount > 0 ? `<span class="slot-tag-more" onclick="openTagDetailModal('${key}', event)" title="すべてのタグを表示">+${remainingCount}</span>` : '') +
          `</div>`;
      }

      const gearParts = ['head', 'clothes', 'shoes'];
      let gearDotsHTML = '';
      gearParts.forEach(part => {
        const gearObj = data.gear ? data.gear[part] : null;
        const mainObj = gearObj ? gearObj.main : null;
        if (mainObj && mainObj.image && mainObj.name !== '未選択' && mainObj.name !== '?') {
          gearDotsHTML += `<div class="slot-preview-gear-dot has-gear" title="${mainObj.name}"><img src="${mainObj.image}"></div>`;
        } else {
          gearDotsHTML += `<div class="slot-preview-gear-dot" title="未設定">-</div>`;
        }
      });

      card.innerHTML = `
        <div class="slot-meta">
          <div style="display:flex; align-items:center; gap:2px; min-width:0;">
            <span class="drag-handle" title="ドラッグで並び替え">☰</span>
            <div class="slot-name" title="${slotNames[key]}">${slotNames[key]}</div>
          </div>
        </div>
        ${tagsHTML}
        <div class="slot-preview-row">
          <div class="slot-preview-weapon-box">
            <div class="slot-preview-weapon-icon">${renderImgOrText(data.weapon, "＋")}</div>
            <div class="slot-preview-weapon-name">${data.weapon.name || '未選択'}</div>
          </div>
          <div class="slot-preview-gears-box" title="メインギアパワープレビュー">
            ${gearDotsHTML}
          </div>
        </div>
        <div class="slot-card-actions" onclick="event.stopPropagation()">
          <button class="mini-btn mini-btn-save" onclick="saveSlotData('${key}')" title="保存"><span class="tab-icon icon-save"></span></button>
          <div class="slot-card-actions-sub">
            <button class="mini-btn mini-btn-clone" onclick="duplicateSlotData('${key}', event)" title="複製"><span class="tab-icon icon-copy"></span></button>
            <button class="mini-btn" onclick="openTagModal('${key}', event)" title="タグ編集"><span class="tab-icon icon-tag"></span></button>
            <button class="mini-btn mini-btn-edit" onclick="renameSlotData('${key}')" title="名前変更"><span class="tab-icon icon-edit"></span></button>
            <button class="mini-btn mini-btn-delete" onclick="deleteSlotData('${key}')" title="削除"><span class="tab-icon icon-delete"></span></button>
          </div>
        </div>`;

      attachTouchDragEvents(card, key);
      wrapper.appendChild(card);
    });
  }

  function switchSlot(key) {
    if (isDirty && currentActiveSlotKey && currentActiveSlotKey !== key) {
      if (!confirm("⚠️ 未保存の変更があります。保存せずに切り替えますか？")) return;
    }

    backupCurrentEditorState();
    currentActiveSlotKey = key; localStorage.setItem(STORAGE_KEY_ACTIVE, key);
    renderVisualSlots(); applySlotData(key);
    updateQuickBarUI();
    markAsClean();

    if (window.innerWidth <= 768) {
      closeMyCodeDrawer();
    }
    showToast("切り替えました");
  }

  function applySlotData(slotKey) {
    const data = slotsData[slotKey] || defaultLayout;
    selectWeapon(data.weapon.name, data.weapon.image, data.weapon.subImage, data.weapon.spImage);
    ['head', 'clothes', 'shoes'].forEach(part => {
      const gPart = data.gear[part]; selectGear(part, gPart.name, gPart.image, false);
      ['main', 'sub0', 'sub1', 'sub2'].forEach(slot => selectPower(part, slot, gPart[slot].name, gPart[slot].image, false));
    });
    updateSens('gyro', data.sensitivity.gyro); updateSens('stick', data.sensitivity.stick);
    document.getElementById('input-memo').value = data.memo || "";
    calculateAndRenderGearTotals();
    markAsClean();
  }

  function getSlotElementData(elementId) {
    const el = document.getElementById(elementId);
    const name = el ? (el.getAttribute('data-name') || "未選択") : "未選択";
    const imgEl = el ? el.querySelector('img') : null;
    return { name, image: imgEl ? imgEl.getAttribute('src') : "" };
  }

  function getWeaponSlotElementData() {
    const el = document.getElementById('slot-weapon');
    const name = el ? (el.getAttribute('data-name') || "未選択") : "未選択";
    const imgEl = el ? el.querySelector('.image-placeholder img') : null;
    return { name, image: imgEl ? imgEl.getAttribute('src') : "", subImage: el ? (el.getAttribute('data-sub-image') || "") : "", spImage: el ? (el.getAttribute('data-sp-image') || "") : "" };
  }

  function saveSlotData(slotKey) {
    const currentTags = (slotsData[slotKey] && slotsData[slotKey].tags) ? slotsData[slotKey].tags : [];
    slotsData[slotKey] = {
      weapon: getWeaponSlotElementData(),
      gear: { head: getGearPartData('head'), clothes: getGearPartData('clothes'), shoes: getGearPartData('shoes') },
      sensitivity: { gyro: document.getElementById('input-gyro').value, stick: document.getElementById('input-stick').value },
      memo: document.getElementById('input-memo').value,
      tags: currentTags
    };
    saveAllToStorage(); 
    renderTagFilterBar();
    renderVisualSlots();
    updateHomeDashboardStats();
    updateQuickBarUI();
    markAsClean();
    showToast(`💾 「${slotNames[slotKey]}」に保存！`);
  }

  function duplicateSlotData(slotKey, event) {
    if (event) event.stopPropagation();
    const sourceData = slotsData[slotKey]; if (!sourceData) return;
    const newKey = "slot_" + Date.now();
    slotNames[newKey] = `${slotNames[slotKey] || "コーデ"} (コピー)`;
    slotsData[newKey] = JSON.parse(JSON.stringify(sourceData));
    saveAllToStorage(); 
    renderTagFilterBar();
    switchSlot(newKey);
    updateHomeDashboardStats();
    showToast("複製しました", "icon-copy");
  }

  function getGearPartData(part) {
    const gearData = getSlotElementData(`slot-${part}`);
    return {
      name: gearData.name, image: gearData.image,
      main: getSlotElementData(`${part}-main`), sub0: getSlotElementData(`${part}-sub0`), sub1: getSlotElementData(`${part}-sub1`), sub2: getSlotElementData(`${part}-sub2`)
    };
  }

  function renameSlotData(slotKey) {
    const newName = prompt("新しいコーデ名：", slotNames[slotKey]);
    if (newName && newName.trim() !== "") {
      slotNames[slotKey] = newName.trim(); saveAllToStorage(); renderVisualSlots();
      updateQuickBarUI();
      showToast("変更しました", "icon-edit");
    }
  }

  function deleteSlotData(slotKey) {
    if (Object.keys(slotNames).length <= 1) { showToast("最低1つのスロットが必要です", "icon-fail"); return; }
    if (confirm(`⚠️ 「${slotNames[slotKey]}」を削除しますか？`)) {
      delete slotNames[slotKey]; delete slotsData[slotKey]; saveAllToStorage();
      if (slotKey === currentActiveSlotKey) { currentActiveSlotKey = ""; localStorage.removeItem(STORAGE_KEY_ACTIVE); clearCurrentEditor(); }
      renderTagFilterBar();
      renderVisualSlots();
      updateHomeDashboardStats();
      updateQuickBarUI();
      showToast(" 削除しました", "icon-delete");
    }
  }

  function saveAllToStorage() {
    localStorage.setItem(STORAGE_KEY_NAMES, JSON.stringify(slotNames));
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(slotsData));
  }

  function getWeaponRangeRank(weaponName) {
    if (
      weaponName.includes("ジェットスイーパー") ||
      weaponName.includes("ダイナモ") ||
      weaponName.includes("エクス") ||
      weaponName.includes("オーバー") ||
      weaponName.includes("バレル") ||
      weaponName.includes("クーゲル") ||
      weaponName.includes("ハイドラント") ||
      weaponName.includes("チャージャー") ||
      weaponName.includes("スコープ") ||
      weaponName.includes("4K") ||
      weaponName.includes("ストリンガー") 
    ) {
      return 1;
    }

    if (
      weaponName.includes("ボトル") ||
      weaponName.includes("Rブラスター") ||
      weaponName.includes("ヴァリアブル") ||
      weaponName.includes("ノーチラス") ||
      weaponName.includes("スクイックリン") ||
      weaponName.includes("ソイチューバー") ||
      weaponName.includes("竹") ||
      weaponName.includes("ジム")
    ) {
      return 2;
    }

    if (
      weaponName.includes("プライム") ||
      weaponName.includes("96") ||
      weaponName.includes("L3") ||
      weaponName.includes("H3") ||
      weaponName.includes("ケルビン") ||
      weaponName.includes("デュアル") ||
      weaponName.includes("ロング") ||
      weaponName.includes("ラピッド") ||
      weaponName.includes("バケット") ||
      weaponName.includes("スクリュー") ||
      weaponName.includes("キャンピング") ||
      weaponName.includes("スプラスピナー") ||
      weaponName.includes("ドライブ") ||
      weaponName.includes("LACT")
    ) {
      return 3;
    }

    if (
      weaponName.includes("わかば") ||
      weaponName.includes("モデラー") ||
      weaponName.includes("シャープマーカー") ||
      weaponName.includes("スプラシューター") ||
      weaponName.includes("ZAP") ||
      weaponName.includes("52") ||
      weaponName.includes("マニューバー") ||
      weaponName.includes("クアッド") ||
      weaponName.includes("ノヴァ") ||
      weaponName.includes("クラッシュ") ||
      weaponName.includes("ホット") ||
      weaponName.includes("カーボン") ||
      weaponName.includes("ヒッセン") ||
      weaponName.includes("パラシェルター") ||
      weaponName.includes("スパイガジェット")
    ) {
      return 4;
    }

    if (
      weaponName.includes("ボールド") ||
      weaponName.includes("スパッタリー") ||
      weaponName.includes("パブロ") ||
      weaponName.includes("ホクサイ")
    ) {
      return 5;
    }

    return 4;
  }
  
  let WEAPON_MAP = new Map(), ALL_WEAPONS = [], activeWeapons = [];
  let currentResultState = { alphaTeam: [], betaTeam: [], spectators: [] };
  let teamConstraints = { fixedAlpha: [], fixedBeta: [], excluded: [] };

  const STORAGE_KEY_PRESETS = 'spla3_app_member_presets_v1';
  const STORAGE_KEY_WEAPONS = 'spla3_app_custom_weapons_v3';
  const STORAGE_KEY_WEAPON_PRESETS = 'spla3_app_weapon_presets_v1';
  const STORAGE_KEY_LAST_RESULT = 'spla3_app_last_result_v1';
  const STORAGE_KEY_HISTORY = 'spla3_app_team_history_v1';
  const STORAGE_KEY_CONSTRAINTS = 'spla3_app_team_constraints_v1';

  function initRandomMakerData() {
    WEAPON_MAP.clear();
    weaponCategoryList.forEach(cat => {
      cat.weapons.forEach(w => {
        w.category = cat.category; w.rangeRank = getWeaponRangeRank(w.name);
        WEAPON_MAP.set(w.name, w);
      });
    });
    ALL_WEAPONS = Array.from(WEAPON_MAP.keys()); activeWeapons = [...ALL_WEAPONS];
    initWeapons(); updatePresetDropdown(); loadResultState(); loadTeamConstraints(); renderHistoryList();
  }

  function loadTeamConstraints() {
    const raw = localStorage.getItem(STORAGE_KEY_CONSTRAINTS);
    if (!raw) return;
    try { teamConstraints = JSON.parse(raw); } catch(e) {}
  }

  function saveTeamConstraints() {
    localStorage.setItem(STORAGE_KEY_CONSTRAINTS, JSON.stringify(teamConstraints));
  }

  function openTeamConstraintModal() {
    document.getElementById('fixed-alpha-input').value = teamConstraints.fixedAlpha.join('\n');
    document.getElementById('fixed-beta-input').value = teamConstraints.fixedBeta.join('\n');
    document.getElementById('exclude-members-input').value = teamConstraints.excluded.join('\n');
    document.getElementById('constraint-modal').classList.add('active');
    
    scrollPositionBeforeModal = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${scrollPositionBeforeModal}px`;
    document.body.classList.add('modal-open');
  }

  function closeConstraintModal(event) {
    if (event && event.target !== document.getElementById('constraint-modal')) return;
    document.getElementById('constraint-modal').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPositionBeforeModal);
  }

  function saveConstraintSettings() {
    teamConstraints.fixedAlpha = document.getElementById('fixed-alpha-input').value.split('\n').map(m => m.trim()).filter(Boolean);
    teamConstraints.fixedBeta = document.getElementById('fixed-beta-input').value.split('\n').map(m => m.trim()).filter(Boolean);
    teamConstraints.excluded = document.getElementById('exclude-members-input').value.split('\n').map(m => m.trim()).filter(Boolean);
    saveTeamConstraints();
    closeConstraintModal();
    showToast('📌 固定枠・除外設定を保存しました');
  }

  function handleImgError(imgEl, fallbackText) {
    imgEl.style.display = 'none';
    if (fallbackText) {
      const badge = document.createElement('span');
      badge.style.fontSize = '0.75rem'; badge.innerText = fallbackText;
      imgEl.parentElement.appendChild(badge);
    }
  }

  function pushHistoryRecord(record) {
    let history = [];
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (raw) { try { history = JSON.parse(raw); } catch(e) {} }
    history.unshift({ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), ...record });
    if (history.length > 5) history = history.slice(0, 5);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    renderHistoryList();
  }

  function renderHistoryList() {
    const container = document.getElementById('history-list-container');
    if (!container) return;
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) { container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">履歴はありません</div>`; return; }
    try {
      const history = JSON.parse(raw);
      if (!history.length) { container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">履歴はありません</div>`; return; }
      container.innerHTML = history.map((rec, idx) => `
        <div class="private-item-card" onclick="restoreHistoryIndex(${idx})" style="padding: 6px 10px;">
          <div class="private-item-title">抽選結果 (${rec.time})</div>
          <div class="private-item-date">α: ${rec.alphaTeam.length}名 / β: ${rec.betaTeam.length}名</div>
        </div>
      `).join('');
    } catch(e) { container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem;">履歴はありません</div>`; }
  }

  function restoreHistoryIndex(idx) {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return;
    try {
      const history = JSON.parse(raw);
      if (history[idx]) {
        applyResultState(history[idx]);
        showToast(`📜 履歴(${history[idx].time})の状態を復元しました`);
      }
    } catch(e) {}
  }

  function clearHistoryList() {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    renderHistoryList();
    showToast(" 抽選履歴をクリアしました", "icon-delete");
  }

  function saveResultState(resultData) {
    currentResultState = resultData;
    localStorage.setItem(STORAGE_KEY_LAST_RESULT, JSON.stringify(resultData));
    pushHistoryRecord(resultData);
  }

  function applyResultState(data) {
    currentResultState = data;
    renderRestoredTeam('grid-alpha', data.alphaTeam, 'alpha');
    renderRestoredTeam('grid-beta', data.betaTeam, 'beta');
    renderSpectators(data.spectators);
    document.getElementById('count-alpha').innerText = `(${data.alphaTeam.length}/4)`;
    document.getElementById('count-beta').innerText = `(${data.betaTeam.length}/4)`;
    document.getElementById('count-spec').innerText = `(${data.spectators.length}人)`;
  }

  function loadResultState() {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_RESULT); if (!raw) return;
    try {
      const data = JSON.parse(raw); applyResultState(data);
    } catch (e) {}
  }

  function resetResultState() {
    localStorage.removeItem(STORAGE_KEY_LAST_RESULT);
    currentResultState = { alphaTeam: [], betaTeam: [], spectators: [] };
    document.getElementById('grid-alpha').innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">抽選ボタンを押してください</div>`;
    document.getElementById('grid-beta').innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">抽選ボタンを押してください</div>`;
    document.getElementById('list-spec').innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">-</div>`;
    document.getElementById('count-alpha').innerText = `(0/4)`; document.getElementById('count-beta').innerText = `(0/4)`; document.getElementById('count-spec').innerText = `(0人)`;
    showToast('🔄 結果をリセットしました');
  }

  function renderRestoredTeam(elementId, playerList, teamKey) {
    const container = document.getElementById(elementId); if (!container) return;
    container.innerHTML = '';
    if (!playerList || playerList.length === 0) { container.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">（メンバーなし）</div>`; return; }

    playerList.forEach((p, index) => {
      const card = document.createElement('div'); card.className = 'player-card';
      let detailsHtml = '';
      if (p.weaponObj) {
        detailsHtml += `
          <div class="weapon-display-box">
            <button class="reroll-btn" onclick="rerollPlayerWeapon('${teamKey}', ${index})"><span class="tab-icon icon-dice" style="width:12px; height:12px;"></span></button>
            <img src="${p.weaponObj.image}" class="weapon-main-img" onerror="handleImgError(this, '🔫')">
            <div class="weapon-info-text">
              <div class="weapon-name-str">${p.weaponObj.name}</div>
            </div>
            <div class="sub-sp-box">
              <img src="${p.weaponObj.subImage}" class="sub-sp-img" onerror="handleImgError(this, 'S')">
              <img src="${p.weaponObj.spImage}" class="sub-sp-img" onerror="handleImgError(this, 'SP')">
            </div>
          </div>`;
      }
      if (p.gearObj) {
        detailsHtml += `
          <div class="gear-display-box">
            <img src="${p.gearObj.image}" class="gear-icon-img" onerror="handleImgError(this, '⚙️')">
            <span class="gear-name-str">${p.gearObj.name}</span>
            <button class="reroll-btn" onclick="rerollPlayerGear('${teamKey}', ${index})"><span class="tab-icon icon-dice" style="width:12px; height:12px;"></span></button>
          </div>`;
      }
      card.innerHTML = `<div class="player-name">${p.name}</div>${detailsHtml}`;
      container.appendChild(card);
    });
  }

  function rerollPlayerWeapon(teamKey, index) {
    if (activeWeapons.length === 0) return;
    const targetTeam = teamKey === 'alpha' ? currentResultState.alphaTeam : currentResultState.betaTeam;
    if (!targetTeam || !targetTeam[index]) return;
    const randWeaponName = activeWeapons[Math.floor(Math.random() * activeWeapons.length)];
    targetTeam[index].weaponObj = WEAPON_MAP.get(randWeaponName);
    renderRestoredTeam(teamKey === 'alpha' ? 'grid-alpha' : 'grid-beta', targetTeam, teamKey);
    saveResultState(currentResultState);
    showToast(`🎲 ${targetTeam[index].name} のブキ変更`);
  }

  function rerollPlayerGear(teamKey, index) {
    const targetTeam = teamKey === 'alpha' ? currentResultState.alphaTeam : currentResultState.betaTeam;
    if (!targetTeam || !targetTeam[index]) return;
    const randGear = gearListNormal[Math.floor(Math.random() * gearListNormal.length)];
    targetTeam[index].gearObj = randGear;
    renderRestoredTeam(teamKey === 'alpha' ? 'grid-alpha' : 'grid-beta', targetTeam, teamKey);
    saveResultState(currentResultState);
    showToast(`🎲 ${targetTeam[index].name} のギア変更`);
  }

  function rerollAllWeapons() {
    if (!currentResultState.alphaTeam.length && !currentResultState.betaTeam.length) return;
    const isNoDup = document.getElementById('opt-no-dup').checked, isBalance = document.getElementById('opt-balance').checked;
    currentResultState.alphaTeam.forEach(p => p.weaponObj = null); currentResultState.betaTeam.forEach(p => p.weaponObj = null);
    assignWeaponsToTeams(currentResultState.alphaTeam, currentResultState.betaTeam, isNoDup, isBalance);
    renderRestoredTeam('grid-alpha', currentResultState.alphaTeam, 'alpha');
    renderRestoredTeam('grid-beta', currentResultState.betaTeam, 'beta');
    saveResultState(currentResultState);
    showToast('🔫 ブキを再抽選しました！');
  }

  function copyResultToClipboard() {
    if (!currentResultState.alphaTeam.length && !currentResultState.betaTeam.length) return;
    let text = "【スプラ3 チーム編成結果】\n\n▼ α TEAM\n";
    currentResultState.alphaTeam.forEach(p => text += `・${p.name}${p.weaponObj ? ` [${p.weaponObj.name}]` : ''}\n`);
    text += "\n▼ β TEAM\n";
    currentResultState.betaTeam.forEach(p => text += `・${p.name}${p.weaponObj ? ` [${p.weaponObj.name}]` : ''}\n`);
    if (currentResultState.spectators?.length) text += "\n▼ 観戦\n・" + currentResultState.spectators.join("、") + "\n";
    navigator.clipboard.writeText(text).then(() => showToast('📋 結果をコピーしました！'));
  }

  function getWeaponPresets() { const raw = localStorage.getItem(STORAGE_KEY_WEAPON_PRESETS); return raw ? JSON.parse(raw) : {}; }
  function saveWeaponPresets(presets) { localStorage.setItem(STORAGE_KEY_WEAPON_PRESETS, JSON.stringify(presets)); }

  function updateWeaponPresetDropdown() {
    const select = document.getElementById('weapon-preset-select'); if (!select) return;
    const presets = getWeaponPresets(); select.innerHTML = '<option value="">-- セットを選択 --</option>';
    Object.keys(presets).forEach(name => select.appendChild(new Option(name, name)));
  }

  function saveCurrentWeaponPreset() {
    const nameInput = document.getElementById('weapon-preset-name-input'); const presetName = nameInput.value.trim();
    const checkedItems = Array.from(document.querySelectorAll('.weapon-item-check:checked')).map(c => c.value);
    if (!presetName || !checkedItems.length) { showToast('⚠️ 名前と対象ブキを指定してください'); return; }
    const presets = getWeaponPresets(); presets[presetName] = checkedItems; saveWeaponPresets(presets);
    updateWeaponPresetDropdown(); nameInput.value = ''; showToast(`💾 「${presetName}」を保存`);
  }

  function loadSelectedWeaponPreset() {
    const select = document.getElementById('weapon-preset-select'); const presetName = select.value; if (!presetName) return;
    const presets = getWeaponPresets();
    if (presets[presetName]) {
      const targetWeapons = presets[presetName];
      document.querySelectorAll('.weapon-item-check').forEach(c => c.checked = targetWeapons.includes(c.value));
      weaponCategoryList.forEach((_, i) => onWeaponItemChange(i));
      updateModalSelectedCount(); showToast(`📋 「${presetName}」を呼び出しました`);
    }
  }

  function deleteSelectedWeaponPreset() {
    const select = document.getElementById('weapon-preset-select'); const presetName = select.value; if (!presetName) return;
    if (confirm(`「${presetName}」を削除しますか？`)) {
      const presets = getWeaponPresets(); delete presets[presetName]; saveWeaponPresets(presets);
      updateWeaponPresetDropdown(); showToast(`🗑️ 「${presetName}」削除`);
    }
  }

  function initWeapons() {
    const saved = localStorage.getItem(STORAGE_KEY_WEAPONS);
    if (saved) { try { activeWeapons = JSON.parse(saved).filter(name => WEAPON_MAP.has(name)); } catch (e) { activeWeapons = [...ALL_WEAPONS]; } }
    updateWeaponCountUI();
  }

  function updateWeaponCountUI() {
    const el = document.getElementById('weapon-count'); if (el) el.innerText = activeWeapons.length;
  }

  function renderWeaponCategoryList() {
    const container = document.getElementById('weapon-category-list'); if (!container) return;
    container.innerHTML = '';
    weaponCategoryList.forEach((catObj, index) => {
      const group = document.createElement('div'); group.className = 'category-group';
      const categoryWeapons = catObj.weapons.map(w => w.name);
      const isAllChecked = categoryWeapons.every(name => activeWeapons.includes(name));
      const checkedCount = categoryWeapons.filter(name => activeWeapons.includes(name)).length;

      group.innerHTML = `
        <div class="category-header" onclick="toggleCategoryOpen('cat-content-${index}')">
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" id="cat-check-${index}" ${isAllChecked ? 'checked' : ''} onclick="event.stopPropagation(); toggleCategoryAll(${index}, this.checked)">
            <span>${catObj.category} (${checkedCount}/${categoryWeapons.length})</span>
          </div>
          <span style="font-size:0.75rem; color:var(--text-muted);">▼ 展開</span>
        </div>
        <div class="category-content hidden" id="cat-content-${index}">
          ${catObj.weapons.map(w => `
            <label class="weapon-item-label">
              <input type="checkbox" class="weapon-item-check cat-item-${index}" value="${w.name}" ${activeWeapons.includes(w.name) ? 'checked' : ''} onchange="onWeaponItemChange(${index})">
              <img src="${w.image}" class="weapon-item-icon" onerror="handleImgError(this, '🔫')">
              <span>${w.name}</span>
            </label>
          `).join('')}
        </div>`;
      container.appendChild(group);
    });
    updateModalSelectedCount();
  }

  function toggleCategoryOpen(contentId) {
    const content = document.getElementById(contentId); if (content) content.classList.toggle('hidden');
  }

  function toggleCategoryAll(groupIndex, isChecked) {
    document.querySelectorAll(`.cat-item-${groupIndex}`).forEach(item => item.checked = isChecked);
    updateModalSelectedCount();
  }

  function onWeaponItemChange(groupIndex) {
    const items = Array.from(document.querySelectorAll(`.cat-item-${groupIndex}`));
    const catCheck = document.getElementById(`cat-check-${groupIndex}`);
    if (catCheck) catCheck.checked = items.every(item => item.checked);
    updateModalSelectedCount();
  }

  function selectAllWeapons(select) {
    document.querySelectorAll('#weapon-category-list input[type="checkbox"]').forEach(c => c.checked = select);
    weaponCategoryList.forEach((_, index) => onWeaponItemChange(index));
    updateModalSelectedCount();
  }

  function updateModalSelectedCount() {
    const checkedItems = document.querySelectorAll('.weapon-item-check:checked');
    const modalCount = document.getElementById('modal-selected-count');
    if (modalCount) modalCount.innerText = checkedItems.length;
  }

  function openWeaponModal() {
    renderWeaponCategoryList(); updateWeaponPresetDropdown();
    document.getElementById('weapon-modal')?.classList.add('active');
    
    scrollPositionBeforeModal = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${scrollPositionBeforeModal}px`;
    document.body.classList.add('modal-open');
  }

  function closeWeaponModal() {
    document.getElementById('weapon-modal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPositionBeforeModal);
  }

  function saveSelectedWeapons() {
    const checkedItems = Array.from(document.querySelectorAll('.weapon-item-check:checked')).map(c => c.value);
    if (!checkedItems.length) { showToast('⚠️ ブキを1つ以上選択してください'); return; }
    activeWeapons = checkedItems;
    localStorage.setItem(STORAGE_KEY_WEAPONS, JSON.stringify(activeWeapons));
    updateWeaponCountUI(); closeWeaponModal(); showToast(`🔫 ${activeWeapons.length}種更新`);
  }

  function getPresets() { const raw = localStorage.getItem(STORAGE_KEY_PRESETS); return raw ? JSON.parse(raw) : {}; }
  function savePresets(presets) { localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets)); }

  function updatePresetDropdown() {
    const select = document.getElementById('preset-select'); if (!select) return;
    const presets = getPresets(); select.innerHTML = '<option value="">-- セットを選択 --</option>';
    Object.keys(presets).forEach(name => select.appendChild(new Option(name, name)));
  }

  function saveCurrentPreset() {
    const nameInput = document.getElementById('preset-name-input'); const presetName = nameInput.value.trim();
    const memberText = document.getElementById('member-input').value;
    if (!presetName || !memberText.trim()) { showToast('⚠️ 名前とメンバーを入力'); return; }
    const presets = getPresets(); presets[presetName] = memberText; savePresets(presets);
    updatePresetDropdown(); nameInput.value = ''; showToast(`💾 「${presetName}」を保存`);
  }

  function loadSelectedPreset() {
    const select = document.getElementById('preset-select'); const presetName = select.value; if (!presetName) return;
    const presets = getPresets();
    if (presets[presetName] !== undefined) { document.getElementById('member-input').value = presets[presetName]; showToast(`📋 読み込み完了`); }
  }

  function deleteSelectedPreset() {
    const select = document.getElementById('preset-select'); const presetName = select.value; if (!presetName) return;
    if (confirm(`セット「${presetName}」を削除しますか？`)) {
      const presets = getPresets(); delete presets[presetName]; savePresets(presets);
      updatePresetDropdown(); showToast(`🗑️ 削除完了`);
    }
  }

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }

  function randomizeTeams() {
    const isSingleMe = document.getElementById('opt-single-me').checked;
    const isWeaponRand = document.getElementById('opt-weapon').checked;
    const isGearRand = document.getElementById('opt-gear').checked;

    if (isWeaponRand && !activeWeapons.length) { showToast('⚠️ 対象ブキがありません'); return; }

    if (isSingleMe) {
      const singlePlayer = { name: "自分", weaponObj: null, gearObj: null };

      if (isWeaponRand) {
        const randWeaponName = activeWeapons[Math.floor(Math.random() * activeWeapons.length)];
        singlePlayer.weaponObj = WEAPON_MAP.get(randWeaponName);
      }
      if (isGearRand) {
        singlePlayer.gearObj = gearListNormal[Math.floor(Math.random() * gearListNormal.length)];
      }

      const alphaTeam = [singlePlayer];
      const betaTeam = [];
      const spectatorNames = [];

      renderRestoredTeam('grid-alpha', alphaTeam, 'alpha');
      renderRestoredTeam('grid-beta', [], 'beta');
      renderSpectators(spectatorNames);

      document.getElementById('count-alpha').innerText = `(1人)`;
      document.getElementById('count-beta').innerText = `(0人)`;
      document.getElementById('count-spec').innerText = `(0人)`;

      saveResultState({ alphaTeam, betaTeam, spectators: spectatorNames });
      showToast('🎲 1人分の抽選が完了しました！');
      return;
    }

    const members = document.getElementById('member-input').value.split('\n').map(m => m.trim()).filter(m => m !== '');
    if (!members.length) { showToast('⚠️ メンバーを入力してください'); return; }

    const validMembers = members.filter(m => !teamConstraints.excluded.includes(m));

    const isNoDup = document.getElementById('opt-no-dup').checked;
    const isBalance = document.getElementById('opt-balance').checked;
    const isRotate = document.getElementById('opt-rotate').checked;

    let alphaNames = [], betaNames = [], spectatorNames = [];

    let fixedAlpha = validMembers.filter(m => teamConstraints.fixedAlpha.includes(m));
    let fixedBeta = validMembers.filter(m => teamConstraints.fixedBeta.includes(m));
    let freeMembers = validMembers.filter(m => !teamConstraints.fixedAlpha.includes(m) && !teamConstraints.fixedBeta.includes(m));

    if (isRotate && currentResultState.spectators?.length) {
      const prevSpecs = currentResultState.spectators.filter(name => freeMembers.includes(name));
      const others = freeMembers.filter(name => !prevSpecs.includes(name));
      freeMembers = [...shuffleArray(prevSpecs), ...shuffleArray(others)];
    } else {
      freeMembers = shuffleArray(freeMembers);
    }

    alphaNames = [...fixedAlpha];
    betaNames = [...fixedBeta];

    const maxPerTeam = 4;
    const neededAlpha = Math.max(0, maxPerTeam - alphaNames.length);
    const neededBeta = Math.max(0, maxPerTeam - betaNames.length);

    alphaNames.push(...freeMembers.slice(0, neededAlpha));
    betaNames.push(...freeMembers.slice(neededAlpha, neededAlpha + neededBeta));

    spectatorNames = freeMembers.slice(neededAlpha + neededBeta);

    const alphaTeam = alphaNames.map(name => ({ name, weaponObj: null, gearObj: null }));
    const betaTeam = betaNames.map(name => ({ name, weaponObj: null, gearObj: null }));

    if (isWeaponRand) assignWeaponsToTeams(alphaTeam, betaTeam, isNoDup, isBalance);
    if (isGearRand) [...alphaTeam, ...betaTeam].forEach(p => p.gearObj = gearListNormal[Math.floor(Math.random() * gearListNormal.length)]);

    renderRestoredTeam('grid-alpha', alphaTeam, 'alpha');
    renderRestoredTeam('grid-beta', betaTeam, 'beta');
    renderSpectators(spectatorNames);

    document.getElementById('count-alpha').innerText = `(${alphaTeam.length}/4)`;
    document.getElementById('count-beta').innerText = `(${betaTeam.length}/4)`;
    document.getElementById('count-spec').innerText = `(${spectatorNames.length}人)`;

    saveResultState({ alphaTeam, betaTeam, spectators: spectatorNames });
    showToast('🎲 抽選が完了しました！');
  }

  function assignWeaponsToTeams(alphaTeam, betaTeam, isNoDup, isBalance) {
    if (!isBalance) {
      const playerCount = Math.max(alphaTeam.length, betaTeam.length);
      let pool = [...activeWeapons];
      for (let i = 0; i < playerCount; i++) {
        if (i < alphaTeam.length) {
          if (!pool.length) pool = [...activeWeapons];
          const idx = Math.floor(Math.random() * pool.length);
          alphaTeam[i].weaponObj = WEAPON_MAP.get(pool[idx]);
          if (isNoDup) pool.splice(idx, 1);
        }
        if (i < betaTeam.length) {
          if (!pool.length) pool = [...activeWeapons];
          const idx = Math.floor(Math.random() * pool.length);
          betaTeam[i].weaponObj = WEAPON_MAP.get(pool[idx]);
          if (isNoDup) pool.splice(idx, 1);
        }
      }
      return;
    }

    const weaponsByRank = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    activeWeapons.forEach(name => {
      const w = WEAPON_MAP.get(name);
      if (weaponsByRank[w.rangeRank]) weaponsByRank[w.rangeRank].push(w);
    });

    Object.keys(weaponsByRank).forEach(r => weaponsByRank[r] = shuffleArray(weaponsByRank[r]));

    const fillTeam = (team) => {
      return team.map(() => {
        const availableRanks = Object.keys(weaponsByRank).filter(r => weaponsByRank[r].length > 0);
        if (availableRanks.length === 0) return null;
        const r = availableRanks[Math.floor(Math.random() * availableRanks.length)];
        return { rank: r, weapon: weaponsByRank[r].pop() };
      });
    };

    const alphaWeapons = fillTeam(alphaTeam);
    
    betaTeam.forEach((p, i) => {
      const alphaRank = alphaWeapons[i] ? alphaWeapons[i].rank : null;
      if (alphaRank && weaponsByRank[alphaRank].length > 0) {
        p.weaponObj = weaponsByRank[alphaRank].pop();
      } else {
        const available = Object.values(weaponsByRank).flat();
        p.weaponObj = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : null;
      }
    });

    alphaTeam.forEach((p, i) => {
      p.weaponObj = alphaWeapons[i] ? alphaWeapons[i].weapon : null;
    });
  }

  function renderSpectators(members) {
    const container = document.getElementById('list-spec'); if (!container) return;
    container.innerHTML = '';
    if (!members || !members.length) { container.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem;">なし</div>`; return; }
    members.forEach(name => {
      const chip = document.createElement('div'); chip.className = 'spectator-chip'; chip.innerText = name;
      container.appendChild(chip);
    });
  }

  let currentActivePrivateId = "";

  function initPrivateMatchSystem() {
    renderPrivateMatchList();
    
    const sortedRecords = [...privateMatchRecords].sort((a, b) => {
      const timeA = a.datetime ? new Date(a.datetime).getTime() : 0;
      const timeB = b.datetime ? new Date(b.datetime).getTime() : 0;
      return timeB - timeA;
    });

    if (sortedRecords.length > 0) switchPrivateRecord(sortedRecords[0].id);
  }

  function renderPrivateMatchList() {
    const wrapper = document.getElementById('private-list-wrapper'); if (!wrapper) return;
    wrapper.innerHTML = "";

    const sortedRecords = [...privateMatchRecords].sort((a, b) => {
      const timeA = a.datetime ? new Date(a.datetime).getTime() : 0;
      const timeB = b.datetime ? new Date(b.datetime).getTime() : 0;
      return timeB - timeA;
    });

    sortedRecords.forEach(rec => {
      const card = document.createElement('div');
      card.className = `private-item-card ${rec.id === currentActivePrivateId ? 'active' : ''}`;
      card.onclick = () => switchPrivateRecord(rec.id);
      let dateDisplay = "日時未設定";
      if (rec.datetime) {
        const dt = new Date(rec.datetime);
        if (!isNaN(dt.getTime())) dateDisplay = `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      }
      card.innerHTML = `<div class="private-item-info"><div class="private-item-title">${rec.title || '無題'}</div><div class="private-item-date"><span class="tab-icon icon-private" style="width:12px; height:12px; vertical-align:middle;"></span> ${dateDisplay}</div></div>`;
      wrapper.appendChild(card);
    });
  }

  function switchPrivateRecord(id) {
    currentActivePrivateId = id; renderPrivateMatchList();
    const selected = privateMatchRecords.find(r => r.id === id);
    if (selected) {
      document.getElementById('preview-display-title').innerText = selected.title || "プラベ詳細";
      updatePrivatePreview(selected);
    }
  }

  /* --- プラベ詳細：コピー用テキスト生成（部屋パス非表示） --- */
  function generatePrivateText(data) {
    let formattedDate = "未定";
    if (data.datetime) {
      const dt = new Date(data.datetime);
      if (!isNaN(dt.getTime())) {
        formattedDate = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      }
    }

    let teamText = "";

    // 1. 試合ごとのチーム分け (matches)
    if (data.matches && Array.isArray(data.matches) && data.matches.length > 0) {
      teamText += `\n■ チーム・試合分け\n`;
      data.matches.forEach((m, idx) => {
        teamText += `\n【${m.round || `第${idx + 1}試合`}】\n`;
        if (m.alpha?.length) teamText += `▼ α TEAM: ` + m.alpha.join(', ') + `\n`;
        if (m.beta?.length) teamText += `▼ β TEAM: ` + m.beta.join(', ') + `\n`;
        if (m.spectators?.length) teamText += `▼ 観戦: ` + m.spectators.join('、') + `\n`;
      });
      teamText += `\n`;
    }
    // 2. 3チーム以上のチーム一覧 (teams 配列)
    else if (data.teams && Array.isArray(data.teams) && data.teams.length > 0) {
      teamText += `\n■ チーム分け\n`;
      data.teams.forEach(t => {
        teamText += `▼ ${t.name || 'チーム'} (${t.members?.length || 0}名)\n・` + (t.members || []).join('\n・') + `\n\n`;
      });
      if (data.spectators?.length) {
        teamText += `▼ 観戦\n・` + data.spectators.join('、') + `\n\n`;
      }
    }
    // 3. 単一のα・βチーム (teams オブジェクト)
    else if (data.teams && (data.teams.alpha || data.teams.beta)) {
      teamText += `\n■ チーム分け\n`;
      if (data.teams.alpha?.length) teamText += `▼ α TEAM\n` + data.teams.alpha.map(m => `・${m}`).join('\n') + `\n`;
      if (data.teams.beta?.length) teamText += `▼ β TEAM\n` + data.teams.beta.map(m => `・${m}`).join('\n') + `\n`;
      const specs = data.teams.spectators || data.spectators;
      if (specs?.length) teamText += `▼ 観戦\n・` + specs.join('、') + `\n\n`;
    }

    const memberArr = data.members ? data.members.split('\n').map(m => m.trim()).filter(m => m !== '') : [];
    const memberListText = memberArr.length ? `■ 参加者 (${memberArr.length}名)：\n${memberArr.map(m => `・${m}`).join('\n')}\n\n` : "";

    return `【 ${data.title || 'プラベ'} 】\n\n■ 開催日時：${formattedDate}\n\n${memberListText}${teamText}■ ルール・内容：\n${data.content || '未設定'}`;
  }

  /* --- プラベ詳細：画面プレビュー描画（部屋パス非表示） --- */
  function updatePrivatePreview(data) {
    const previewEl = document.getElementById('private-preview');
    const teamBtn = document.getElementById('btn-view-private-teams');
    if (!previewEl) return;

    let formattedDate = "未定";
    if (data.datetime) {
      const dt = new Date(data.datetime);
      if (!isNaN(dt.getTime())) {
        formattedDate = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      }
    }

    // チームデータが存在するかどうかでタイトルの横のボタンの表示/非表示を切り替え
    const hasTeams = (data.matches && data.matches.length > 0) || 
                     (data.teams && (Array.isArray(data.teams) ? data.teams.length > 0 : (data.teams.alpha?.length || data.teams.beta?.length)));
    
    if (teamBtn) {
      teamBtn.style.display = hasTeams ? "inline-flex" : "none";
    }

    const memberArr = data.members ? data.members.split('\n').map(m => m.trim()).filter(m => m !== '') : [];

    previewEl.innerHTML = `
      <div style="font-weight:bold; font-size:1.05rem; margin-bottom:8px;">【 ${data.title || 'プラベ'} 】</div>
      <div><b>開催日時：</b>${formattedDate}</div>
      ${memberArr.length ? `<div style="margin-top:8px;"><b>参加者 (${memberArr.length}名)：</b><br>${memberArr.join('、')}</div>` : ''}
      <div style="margin-top:12px; border-top:1px dashed var(--border-color); padding-top:10px;">
        <b>ルール・内容：</b>
        <div style="margin-top:4px; line-height:1.5;">${data.content || '未設定'}</div>
      </div>
    `;
  }

  /* --- プラベチーム確認モーダル制御 --- */
  function openPrivateTeamModal() {
    const selected = privateMatchRecords.find(r => r.id === currentActivePrivateId);
    if (!selected) return;

    const modalBody = document.getElementById('private-team-modal-body');
    const modalTitle = document.getElementById('private-team-modal-title');
    if (modalTitle) modalTitle.innerText = `👥 ${selected.title || 'プラベ'} - チーム分け`;

    let teamsHTML = "";

    // 1. 試合ごとのチーム分け (matches)
    if (selected.matches && Array.isArray(selected.matches) && selected.matches.length > 0) {
      selected.matches.forEach((m, idx) => {
        const alphaList = (m.alpha || []).map(p => `<div class="player-card" style="padding:4px 8px;"><div class="player-name" style="border:none; padding:0; font-size:0.82rem;">${p}</div></div>`).join('');
        const betaList = (m.beta || []).map(p => `<div class="player-card" style="padding:4px 8px;"><div class="player-name" style="border:none; padding:0; font-size:0.82rem;">${p}</div></div>`).join('');
        
        let specHTML = "";
        if (m.spectators && m.spectators.length > 0) {
          specHTML = `
            <div style="margin-top:6px; font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <span>観戦:</span>
              <div class="spectator-list" style="display:inline-flex; gap:4px;">
                ${m.spectators.map(s => `<span class="spectator-chip" style="padding:2px 8px; font-size:0.75rem;">${s}</span>`).join('')}
              </div>
            </div>`;
        }

        teamsHTML += `
          <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:10px 12px; margin-bottom:10px;">
            <div style="font-weight:800; font-size:0.88rem; color:var(--splat-yellow); margin-bottom:8px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">
              🎮 ${m.round || `第${idx + 1}試合`}
            </div>
            <div class="teams-container" style="gap:8px;">
              <div class="team-card alpha" style="padding:8px 10px;">
                <div class="team-header" style="font-size:0.82rem; margin-bottom:6px; padding-bottom:4px;">α TEAM (${m.alpha?.length || 0})</div>
                <div class="player-grid" style="gap:6px;">${alphaList}</div>
              </div>
              <div class="team-card beta" style="padding:8px 10px;">
                <div class="team-header" style="font-size:0.82rem; margin-bottom:6px; padding-bottom:4px;">β TEAM (${m.beta?.length || 0})</div>
                <div class="player-grid" style="gap:6px;">${betaList}</div>
              </div>
            </div>
            ${specHTML}
          </div>
        `;
      });
    }
    // 2. 3チーム以上のチーム一覧 (teams 配列)
    else if (selected.teams && Array.isArray(selected.teams) && selected.teams.length > 0) {
      teamsHTML += `
        <div style="display:grid; grid-template-columns:1fr; gap:10px;">
          ${selected.teams.map((t, idx) => `
            <div class="team-card" style="padding:10px; border-color:var(--border-color);">
              <div class="team-header" style="font-size:0.88rem; color:var(--splat-yellow); margin-bottom:6px; padding-bottom:4px;">
                ${t.name || `チーム${idx + 1}`} (${t.members?.length || 0}名)
              </div>
              <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px;">
                ${(t.members || []).map(p => `<div class="player-card" style="padding:4px 8px;"><div class="player-name" style="border:none; padding:0; font-size:0.82rem;">${p}</div></div>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    // 3. 単一のα・βチーム (teams オブジェクト)
    else if (selected.teams && (selected.teams.alpha || selected.teams.beta)) {
      const alphaList = (selected.teams.alpha || []).map(m => `<div class="player-card" style="padding:6px 10px;"><div class="player-name" style="border:none; padding:0;">${m}</div></div>`).join('');
      const betaList = (selected.teams.beta || []).map(m => `<div class="player-card" style="padding:6px 10px;"><div class="player-name" style="border:none; padding:0;">${m}</div></div>`).join('');
      
      let specHTML = "";
      if (selected.teams.spectators?.length) {
        specHTML = `
          <div class="team-card" style="margin-top:8px; padding:10px;">
            <div class="team-header" style="color:var(--text-muted); margin-bottom:6px; font-size:0.85rem;">観戦</div>
            <div class="spectator-list">${selected.teams.spectators.map(s => `<div class="spectator-chip">${s}</div>`).join('')}</div>
          </div>`;
      }

      teamsHTML = `
        <div class="teams-container" style="gap:10px;">
          <div class="team-card alpha" style="padding:12px;">
            <div class="team-header" style="font-size:0.95rem; margin-bottom:8px;">α TEAM (${selected.teams.alpha?.length || 0})</div>
            <div class="player-grid">${alphaList}</div>
          </div>
          <div class="team-card beta" style="padding:12px;">
            <div class="team-header" style="font-size:0.95rem; margin-bottom:8px;">β TEAM (${selected.teams.beta?.length || 0})</div>
            <div class="player-grid">${betaList}</div>
          </div>
          ${specHTML}
        </div>
      `;
    }

    if (modalBody) modalBody.innerHTML = teamsHTML || "<div style='color:var(--text-muted); text-align:center;'>チーム設定がありません</div>";

    scrollPositionBeforeModal = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.top = `-${scrollPositionBeforeModal}px`;
    document.body.classList.add('modal-open');
    document.getElementById('private-team-modal')?.classList.add('active');
  }

  function closePrivateTeamModal(event) {
    if (event && event.target !== document.getElementById('private-team-modal')) return;
    document.getElementById('private-team-modal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, scrollPositionBeforeModal);
  }

  function copyPrivateMatchText() {
    const selected = privateMatchRecords.find(r => r.id === currentActivePrivateId);
    if (!selected) return;
    const textToCopy = generatePrivateText(selected);
    navigator.clipboard.writeText(textToCopy).then(() => showToast('📋 この内容をコピーしました！'));
  }

  window.addEventListener('DOMContentLoaded', () => {
    initSlotSystem(); 
    initRandomMakerData(); 
    initPrivateMatchSystem();
    
    const lastTab = localStorage.getItem(STORAGE_KEY_LAST_TAB) || 'home';
    switchMainTab(lastTab);
  });

  function toggleTagFilterCollapse(forceOpen = null) {
    const btn = document.getElementById('tag-filter-toggle-btn');
    const wrapper = document.getElementById('tag-filter-accordion-wrapper');
    if (!wrapper) return;
    const isOpen = forceOpen !== null ? forceOpen : !wrapper.classList.contains('open');
    if (isOpen) {
      wrapper.classList.add('open');
      if (btn) btn.classList.add('open');
    } else {
      wrapper.classList.remove('open');
      if (btn) btn.classList.remove('open');
    }
  }