document.addEventListener('contextmenu', event => event.preventDefault());

let userBalance = 0;
let tapIncome = 10; // Доход за один клик

$(document).ready(() => {
    const user = Telegram.WebApp.initDataUnsafe.user;
    const clickArea = document.getElementById('click-area'); // Область для кликов

    // Функция для обработки кликов
    const handleClick = () => {
        // Добавляем монеты к балансу
        userBalance += tapIncome;

        // Обновляем отображение баланса
        $("#balance_num").html(userBalance.toLocaleString('ru-RU'));

        // Создаем анимацию "+монеты"
        const plusTen = document.createElement('div');
        plusTen.classList.add('float-up');
        plusTen.innerText = `+${tapIncome}`;
        plusTen.style.left = `${Math.random() * 80 + 10}%`; // Случайное положение по горизонтали
        plusTen.style.top = `${Math.random() * 80 + 10}%`; // Случайное положение по вертикали
        clickArea.appendChild(plusTen);

        // Удаляем анимацию через 1 секунду
        setTimeout(() => plusTen.remove(), 1000);
    };

    // Обработка кликов на области
    clickArea.addEventListener('click', handleClick);

    // Функция для загрузки бустеров
    const loadBoosters = () => {
        $.post('/api/boost/list.php', { user_id: user.id, user_name: user.username }, (response) => {
            const boosters = response;
            const boosterContainer = $('.page-boost .row');
            boosterContainer.empty();

            if (boosters.length === 0) {
                boosterContainer.append('<div class="col-12"><p class="text-center">Нет доступных улучшений.</p></div>');
                return;
            }

            boosters.forEach(booster => {
                const boosterLvl = booster.booster_lvl;
                const maxLvl = booster.booster_max_lvl;
                const nextLvl = boosterLvl + 1;
                const upgradePrice = booster.booster_prices[nextLvl] || 'Максимум';

                const priceForNextLvl = booster.booster_prices[nextLvl];
                const canAfford = typeof priceForNextLvl === 'number' && userBalance >= priceForNextLvl;

                const currencyIcon = nextLvl > maxLvl ? '' : canAfford
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                           <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#DAA520" stroke-width="4"/>
                       </svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                           <circle cx="12" cy="12" r="10" fill="#C0C0C0" stroke="#A9A9A9" stroke-width="4"/>
                       </svg>`;

                const description = booster.booster_descriptions && booster.booster_descriptions[nextLvl]
                    ? booster.booster_descriptions[nextLvl]
                    : booster.booster_description;

                const boosterCard = `
                    <div class="col-6" style="padding: 0;">
                        <a href="#" class="booster-card" data-id="${booster.booster_code}" data-img="${booster.booster_image}" data-title="${booster.booster_name} (lvl ${nextLvl})" data-description="${description}" data-price="${upgradePrice}" data-lvl="${boosterLvl}" data-max-lvl="${maxLvl}">
                            <div class="card card-style shadow-xl">
                                <div class="content">
                                    <center>
                                        <img src="${booster.booster_image}" style="border-radius: 10px; width: 100%">
                                        <b>${typeof upgradePrice === 'number' ? upgradePrice.toLocaleString('ru-RU') : upgradePrice}</b>
                                        ${currencyIcon}
                                        <br>
                                        ${booster.booster_name}<br>
                                        <span style="color: gray;">(уровень: ${boosterLvl})</span>
                                    </center>
                                </div>
                            </div>
                        </a>
                    </div>`;
                boosterContainer.append(boosterCard);
            });
        }).fail((xhr, status, error) => {
            console.error("Ошибка при загрузке улучшений:", error);
        });
    };

    // Обновление баланса и загрузка бустеров
    $.post('/api/interface/update.php', { user_id: user.id, user_name: user.username }, (response) => {
        const json = jQuery.parseJSON(response);
        userBalance = parseInt(json.balance);
        $("#balance_num").html(userBalance.toLocaleString('ru-RU'));
        loadBoosters();
    });

    // Обработка покупки бустеров
    $(document).on('click', '.booster-card', function (e) {
        e.preventDefault();
        const boosterImg = $(this).data('img');
        const boosterTitle = $(this).data('title');
        const boosterDescription = $(this).data('description');
        const boosterPrice = $(this).data('price');
        const boosterLvl = $(this).data('lvl');
        const maxLvl = $(this).data('max-lvl');

        if (boosterLvl >= maxLvl) {
            Swal.fire({
                icon: 'error',
                title: 'Максимальный уровень',
                text: 'Вы достигли максимального уровня улучшения.',
                confirmButtonColor: "#db4552",
                confirmButtonText: 'Закрыть'
            });
            return;
        }

        Swal.fire({
            title: boosterTitle,
            html: `
                <img src="${boosterImg}" style="border-radius: 10px; width: 50%; margin-bottom: 20px;">
                <p>${boosterDescription}</p>
                <p><strong>Стоимость улучшения:</strong> ${typeof boosterPrice === 'number' ? boosterPrice.toLocaleString('ru-RU') : boosterPrice} BMJ</p>
            `,
            showCancelButton: true,
            confirmButtonText: 'Купить',
            confirmButtonColor: "#8bc05d",
            cancelButtonText: 'Отмена',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                buyBooster($(this).data('id'), boosterLvl + 1);
            }
        });
    });

    // Функция для покупки бустера
    const buyBooster = (boosterCode, newLevel) => {
        $.post('/api/boost/buy.php', { user_id: user.id, booster_code: boosterCode, booster_level: newLevel }, (response) => {
            const data = response;
            if (data.status === "success") {
                Swal.fire({
                    icon: 'success',
                    title: 'Покупка завершена',
                    text: 'Вы получили новое улучшение!',
                    confirmButtonColor: "#8bc05d",
                    confirmButtonText: 'Закрыть'
                }).then(() => {
                    $.post('/api/interface/update.php', { user_id: user.id, user_name: user.username }, (response) => {
                        const json = jQuery.parseJSON(response);
                        userBalance = parseInt(json.balance);
                        $("#balance_num").html(userBalance.toLocaleString('ru-RU'));
                        loadBoosters();
                    });
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Ошибка',
                    text: data.message,
                    confirmButtonColor: "#db4552",
                    confirmButtonText: 'Закрыть'
                });
            }
        }).fail((xhr, status, error) => {
            console.error("Ошибка при покупке бустера:", error);
        });
    };
});