const FINCODE_PUBLIC_KEY =
  "p_test_NjVjYzc1YzAtZTg3MC00YjEyLWFmNzctOTNlOWY1YjFiM2IyMjNmNzNmNjQtZTY3Mi00MjIyLTgzMDMtZDUwZTg1ZmI0OTEyc18yNDA3MjYyMDg3MA";

const fincode = Fincode(FINCODE_PUBLIC_KEY);

const creditCardCreateFormButton = document.getElementById(
  "credit-card-create-submit",
);
const cardNumberInput = document.getElementById("card-number");

const creditCardPurchaseFormButton = document.getElementById(
  "credit-card-purchase-submit",
);
const cardIdInput = document.getElementById("card-id");

const fetchCreditCardList = document.getElementById("fetch-credit-card-list");

const card3dsSuccessInputButton = document.getElementById("3ds-success");
const card3dsFailedInputButton = document.getElementById("3ds-failed");
const card3dsChallengeInputButton = document.getElementById("3ds-challenge");

card3dsSuccessInputButton.addEventListener("click", () => {
  cardNumberInput.value = "4100000000000100";
});
card3dsFailedInputButton.addEventListener("click", () => {
  cardNumberInput.value = "4100000000200007";
});
card3dsChallengeInputButton.addEventListener("click", () => {
  cardNumberInput.value = "4100000000005000";
});

function handleCreditCardCreate() {
  const cardNumber = document.getElementById("card-number");
  const cardExpiration = document.getElementById("card-expire");
  const cardCvv = document.getElementById("card-cvv");

  fincode.tokens(
    {
      card_no: cardNumber.value,
      expire: cardExpiration.value,
      security_code: cardCvv.value,
    },
    async (status, response) => {
      if (status !== 200) {
        alert("カード登録に失敗しました");
        return;
      }

      const tokenInfo = response.list.at(0);
      if (tokenInfo == null) {
        alert("クレジットカード情報が正しくありません");
        return;
      }

      const token = tokenInfo.token;

      const result = await fetch("/api/payment/card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await result.json();

      window.open(data.redirect_url, "_blank");
    },
    (error) => {
      console.error(error);
    },
  );
}

async function handleCreditCardPurchase() {
  const cardId = cardIdInput.value;

  const response = await fetch("/api/payment/purchase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cardId }),
  });

  const result = await response.json();

  console.log(result);
}

creditCardCreateFormButton.addEventListener("click", handleCreditCardCreate);
creditCardPurchaseFormButton.addEventListener(
  "click",
  handleCreditCardPurchase,
);

fetchCreditCardList.addEventListener("click", async () => {
  const result = await fetch("/api/payment/card", {
    method: "GET",
  });

  const data = await result.json();

  console.log(data);
});
