const FINCODE_PUBLIC_KEY =
  "p_test_OWY4ZjY3MTctMmQ3YS00ZjU2LThlNjAtMDFlOTg5NWU1NmIzYzY0YWRjMzMtNmVhNy00NjQ5LWFmMzEtZjllNDEwOTI3YzI0c18yNDA3MTU4Mjk4NA";

const fincode = Fincode(FINCODE_PUBLIC_KEY);

const creditCardFormButton = document.getElementById("credit-card-form-submit");
function handleCreditCardPurchase() {
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
        alert("決済に失敗しました");
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

      if (result.status !== 200) {
        alert("決済に失敗しました");
        return;
      }

      alert("決済が完了しました");
    },
    (error) => {
      console.error(error);
    },
  );
}

creditCardFormButton.addEventListener("click", handleCreditCardPurchase);
