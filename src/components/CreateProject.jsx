import React, { useState } from "react";
import { Button, Modal, Alert } from "react-bootstrap";
import api from "../axiosConfig";
import { useNavigate } from "react-router-dom";

const CreateProject = async ({ name, description, ram, vcpus, disk, pack }) => {
  try {
    const payload = {
      name,
      description,
      allocatedResources: { ram, vcpus, disk },
      pack,
    };

    // Fetch user profile to check if a project already exists
    const userProfileResponse = await api.get("/api/auth");
    const userProjectId = userProfileResponse.data.project_id;

    if (userProjectId) {
      await api.post("/api/project/update-project", payload);
    } else {
      await api.post("/api/project/create-project", payload);
    }

    return { success: true, message: "Project created successfully" };
  } catch (err) {
    console.error("Project creation error:", err);
    return { success: false, error: err.response?.data?.error || "Error processing project" };
  }
};

const ProjectConfirmationModal = ({ show, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token"); 
    localStorage.removeItem("projectId"); 
    navigate("/login"); 
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Project Created Successfully</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Your project has been successfully created. <br />
        You need to log in again to apply changes.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={handleLogout}>
          Log In Again
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export { CreateProject, ProjectConfirmationModal };
