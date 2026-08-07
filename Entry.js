const entryForm = document.getElementById('entryForm');
const loadDateText = document.getElementById('loadDateText');
const loadDatePicker = document.getElementById('loadDatePicker');

function formatDateToText(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatTextToDate(value) {
  const match = /^([0-3]\d)-([0-1]\d)-(\d{4})$/.exec(value.trim());
  if (!match) return '';
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}`);
  if (date.getFullYear() !== Number(year) || date.getMonth() + 1 !== Number(month) || date.getDate() !== Number(day)) {
    return '';
  }
  return date.toISOString().substring(0, 10);
}

loadDatePicker.addEventListener('input', () => {
  loadDateText.value = formatDateToText(loadDatePicker.value);
});

loadDateText.addEventListener('blur', () => {
  const dateValue = formatTextToDate(loadDateText.value);
  if (dateValue) {
    loadDatePicker.value = dateValue;
    loadDateText.setCustomValidity('');
  } else if (loadDateText.value.trim() !== '') {
    loadDateText.setCustomValidity('Please enter a valid date in dd-mm-yyyy format.');
  } else {
    loadDateText.setCustomValidity('');
  }
});

entryForm.addEventListener('submit', (event) => {
  const quantityInput = document.getElementById('quantity');
  const quantityValue = quantityInput.value.trim();
  const isQuantityValid = /^\d+$/.test(quantityValue);
  } else {
    quantityInput.setCustomValidity('');
  }

  if (loadDateText.value.trim() !== '' && !formatTextToDate(loadDateText.value)) {
    loadDateText.setCustomValidity('Please enter a valid date in dd-mm-yyyy format.');
  } else {
    loadDateText.setCustomValidity('');
  }

  if (!entryForm.checkValidity()) {
    event.preventDefault();
    entryForm.reportValidity();
    return;
  }

  event.preventDefault();
  alert('entry saved successfully.');
});
