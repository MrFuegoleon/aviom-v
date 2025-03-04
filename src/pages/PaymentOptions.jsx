import React, { useState, useEffect } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Modal, Button } from "react-bootstrap";  // Import Bootstrap Modal
import axios from "axios";
import { CreateProject } from "../components/CreateProject";

const PaymentOptions = ({ name, description, ram, vcpus, disk, pack }) => {
  const [clientID, setClientID] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);  

  console.log("VM Name:", name);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/paypal/client-id")
      .then((response) => {
        setClientID(response.data.clientId);
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération du Client ID PayPal:", error);
        setError("Impossible de récupérer le Client ID PayPal.");
      });
  }, []);

  const handleCreateProject = async () => {
    setLoading(true);
    try {
      const response = await CreateProject({
        name,
        description,
        ram: ram * 10 ** 3,   // 🔹 Convert RAM to 10^3
        vcpus,
        disk: disk * 10 ** 3,  // 🔹 Convert Disk to 10^3
        pack,
      });
  
      if (response.success) {
        setShowModal(true); // Show success modal
      } else {
        setError(response.error || "Erreur lors de la création du projet.");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la création du projet.");
    }
    setLoading(false);
  };
  
  const handleGoCardlessPayment = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/gocardless/create-payment",
        {
          amount: 1000,
          currency: "EUR",
          mandate: "MD00169GANWJ3RS",
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
  
      console.log("Réponse GoCardless:", response.data);
  
      if (response.data.payments.id) {
        alert(`Paiement GoCardless initié ! ID: ${response.data.payments.id}`);
  
        // ✅ Supprimer la redirection
        // window.location.href = `/confirmation-paiement?paymentId=${response.data.payments.id}`;
  
        // ✅ Créer le projet immédiatement après le paiement
        const projectResponse = await handleCreateProject();
  
        if (projectResponse.success) {
          setShowModal(true);  // ✅ Affiche le pop-up après le paiement
        } else {
          setError(projectResponse.error || "Erreur lors de la création du projet.");
        }
      } else {
        console.warn("Aucune URL de redirection reçue.");
      }
    } catch (error) {
      console.error("Erreur GoCardless :", error);
      setError("Erreur lors du paiement GoCardless.");
    }
    setLoading(false);
  };
  
  
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("projectId");
  
    setTimeout(() => {
      window.location.href = "/login";
    }, 3000);
  };
  
  return (
    <div>
      <h2>Choisissez votre méthode de paiement</h2>

      {/* Affichage des erreurs si problème de récupération du Client ID */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Boutons de sélection des méthodes de paiement */}
      <button onClick={() => setSelectedPayment("paypal")} disabled={loading}>
        Payer avec PayPal
      </button>
      <button onClick={() => setSelectedPayment("gocardless")} disabled={loading}>
        Payer avec GoCardless
      </button>

      {/* Loading Indicator */}
      {loading && <p>Processing payment...</p>}

      {/* Intégration du bouton PayPal uniquement si le Client ID est récupéré */}
      {clientID && selectedPayment === "paypal" && (
        <PayPalScriptProvider options={{ "client-id": clientID, currency: "EUR" }}>
          <PayPalButtons
            createOrder={async () => {
              try {
                const response = await axios.post("http://localhost:5000/api/paypal/create-payment");
                return response.data.orderID;
              } catch (error) {
                console.error("Erreur lors de la création de la commande PayPal:", error);
                throw new Error("Erreur lors de la création de la commande PayPal");
              }
            }}
            onApprove={async (data, actions) => {
              return actions.order.capture().then(async (details) => {
                console.log("Paiement réussi :", details);
                alert("Paiement PayPal réussi !");
                
                // Ensure project is created after successful PayPal payment
                await handleCreateProject();
              });
            }}
          />
        </PayPalScriptProvider>
      )}

      {/* GoCardless */}
      {selectedPayment === "gocardless" && (
        <div>
          <p>Vous serez redirigé vers GoCardless pour finaliser le paiement.</p>
          <button onClick={handleGoCardlessPayment} disabled={loading}>
            Confirmer le paiement
          </button>
        </div>
      )}

    {/* Modal de succès */}
    <Modal show={showModal} onHide={handleLogout} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Projet créé avec succès</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Votre projet a été créé avec succès. <br />
        Vous devez vous reconnecter pour appliquer les modifications.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={handleLogout}>
          Se reconnecter
        </Button>
      </Modal.Footer>
    </Modal>
    </div>
  );
};

export default PaymentOptions;
