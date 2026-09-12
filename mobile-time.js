(() => {
    const dialog = document.createElement('dialog');
    dialog.className = 'mobile-time-dialog';
    dialog.setAttribute('aria-labelledby', 'mobileTimeTitle');
    dialog.innerHTML = `
        <form>
            <h2 id="mobileTimeTitle">Edit shift</h2>
            <p id="mobileTimeDate"></p>
            <div class="field">
                <label for="mobileCheckIn">Check-in time</label>
                <input id="mobileCheckIn" type="time" />
                <div class="time-shortcuts" data-target="mobileCheckIn">
                    <button type="button" class="ghost-btn" data-time="13:30">1:30 PM</button>
                    <button type="button" class="ghost-btn" data-time="14:15">2:15 PM</button>
                    <button type="button" class="ghost-btn" data-time="15:00">3:00 PM</button>
                </div>
            </div>
            <div class="field">
                <label for="mobileCheckOut">Check-out time</label>
                <input id="mobileCheckOut" type="time" />
                <div class="time-shortcuts" data-target="mobileCheckOut">
                    <button type="button" class="ghost-btn" data-time="17:00">5:00 PM</button>
                    <button type="button" class="ghost-btn" data-time="21:00">9:00 PM</button>
                    <button type="button" class="ghost-btn" data-time="21:15">9:15 PM</button>
                </div>
            </div>
            <p class="mobile-time-summary" aria-live="polite"></p>
            <p class="mobile-time-error" role="alert"></p>
            <div class="mobile-time-actions">
                <button type="button" class="ghost-btn" data-action="clear">Clear times</button>
                <button type="button" class="ghost-btn" data-action="cancel">Cancel</button>
                <button type="submit" class="primary-btn">Save</button>
            </div>
        </form>`;
    document.body.append(dialog);
    const form = dialog.querySelector('form');
    const checkIn = dialog.querySelector('#mobileCheckIn');
    const checkOut = dialog.querySelector('#mobileCheckOut');
    const error = dialog.querySelector('.mobile-time-error');
    let original;
    let origin;
    let saving = false;

    function draft() {
        return normalizeShift({ ...original, checkIn: checkIn.value, checkOut: checkOut.value });
    }

    function preview() {
        const shift = draft();
        dialog.querySelector('.mobile-time-summary').textContent =
            `${shift.totalHours.toFixed(2)} hours / Break ${shift.breakHours ? '30' : '0'} min`;
    }

    document.addEventListener('click', event => {
        const trigger = event.target.closest('.mobile-time-trigger');
        if (!trigger) return;
        origin = { date: trigger.closest('tr').dataset.date, field: trigger.dataset.timeField };
        original = { ...getOrCreateShift(origin.date) };
        checkIn.value = original.checkIn;
        checkOut.value = original.checkOut;
        error.textContent = '';
        dialog.querySelector('#mobileTimeDate').textContent = origin.date;
        preview();
        dialog.showModal();
    });

    form.addEventListener('input', preview);
    form.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || saving) return;
        if (button.dataset.time) {
            dialog.querySelector(`#${button.parentElement.dataset.target}`).value = button.dataset.time;
            preview();
        }
        if (button.dataset.action === 'clear') {
            checkIn.value = '';
            checkOut.value = '';
            preview();
        }
        if (button.dataset.action === 'cancel') dialog.close();
    });
    dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    dialog.addEventListener('close', () => {
        document.querySelector(`tr[data-date="${origin.date}"] [data-time-field="${origin.field}"]`)?.focus();
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (saving) return;
        saving = true;
        error.textContent = '';
        form.querySelectorAll('button, input').forEach(control => { control.disabled = true; });
        try {
            const shift = draft();
            if (!shift.checkIn && !shift.checkOut && !shift.isHoliday) await deleteShift(shift.id);
            else await persistShift(shift);
            dialog.close();
        } catch (err) {
            error.textContent = 'Could not save. Please try again.';
        } finally {
            saving = false;
            form.querySelectorAll('button, input').forEach(control => { control.disabled = false; });
        }
    });
})();
