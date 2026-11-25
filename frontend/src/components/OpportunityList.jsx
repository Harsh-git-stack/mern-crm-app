import toast from "react-hot-toast";
import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContextValue";
import OpportunityForm from "./OpportunityForm";
import OpportunityEditForm from "./OpportunityEditForm";
import ConfirmModal from "./ConfirmModal";

// --- UTILITY COMPONENTS ---
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const TimeAgo = ({ date }) => {
    const [time, setTime] = useState('');
    useEffect(() => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) { setTime(Math.floor(interval) + " years ago"); return; }
        interval = seconds / 2592000;
        if (interval > 1) { setTime(Math.floor(interval) + " months ago"); return; }
        interval = seconds / 86400;
        if (interval > 1) { setTime(Math.floor(interval) + " days ago"); return; }
        interval = seconds / 3600;
        if (interval > 1) { setTime(Math.floor(interval) + " hours ago"); return; }
        interval = seconds / 60;
        if (interval > 1) { setTime(Math.floor(interval) + " minutes ago"); return; }
        setTime(Math.floor(seconds) + " seconds ago");
    }, [date]);
    return <span title={new Date(date).toLocaleString()}>{time}</span>;
};

function OpportunityList() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [refreshList, setRefreshList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [viewingFilesFor, setViewingFilesFor] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [viewingActivityFor, setViewingActivityFor] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const { token } = useContext(AuthContext);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const fetchOpportunities = async () => {
        if (!token) {
          setError("Authentication token not found. Please log in.");
          setLoading(false);
          return;
        }
        try {
          setLoading(true);
          const url = `/api/opportunities?search=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=10`;
          const response = await fetch(url, { headers: { "x-auth-token": token } });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.msg || "Failed to fetch opportunities");
          }
          const data = await response.json();
          setOpportunities(data.opportunities);
          setCurrentPage(data.currentPage);
          setTotalPages(data.totalPages);
          setError(null);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchOpportunities();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, refreshList, currentPage, token]);

  const handleViewFiles = async (opportunityId) => {
    if (viewingFilesFor === opportunityId) {
      setViewingFilesFor(null);
      return;
    }
    setViewingFilesFor(opportunityId);
    setLoadingFiles(true);
    setAttachedFiles([]);
    try {
      const response = await fetch(`/api/files/Opportunity/${opportunityId}`, {
        headers: { "x-auth-token": token },
      });
      if (!response.ok) throw new Error('Could not load attachments.');
      const files = await response.json();
      setAttachedFiles(files);
    } catch (err) {
      toast.error(err.message);
      setViewingFilesFor(null);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const response = await fetch(`/api/files/download/${file._id}`, {
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Could not download file.');
      }

      const downloadUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.originalname;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleViewActivity = async (opportunityId) => {
    if (viewingActivityFor === opportunityId) {
      setViewingActivityFor(null);
      return;
    }
    setViewingActivityFor(opportunityId);
    setLoadingActivities(true);
    try {
      const response = await fetch(`/api/activities/Opportunity/${opportunityId}`, {
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) throw new Error('Could not load activity feed.');
      const data = await response.json();
      setActivities(data);
    } catch (err) {
      toast.error(err.message);
      setViewingActivityFor(null);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleOpportunityAdded = () => {
    setShowForm(false);
    setCurrentPage(1);
    setRefreshList(!refreshList);
  };

  const handleOpportunityUpdated = (updatedOpportunity) => {
    setOpportunities(opportunities.map((opp) => (opp._id === updatedOpportunity._id ? updatedOpportunity : opp)));
    setEditingOpportunity(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingOpportunity(null);
  };

  const openDeleteModal = (opportunityId) => {
    setIdToDelete(opportunityId);
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setIdToDelete(null);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    try {
      const response = await fetch(`/api/opportunities/${idToDelete}`, {
        method: "DELETE",
        headers: { "x-auth-token": token },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "Failed to delete opportunity");
      }
      toast.success("Opportunity deleted successfully!");
      setRefreshList((prev) => !prev);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      closeDeleteModal();
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="resource-page resource-opportunities">
      <ConfirmModal isOpen={isModalOpen} message="Are you sure you want to delete this opportunity?" onConfirm={confirmDelete} onCancel={closeDeleteModal} />
      
      <div className="resource-header">
        <div>
          <p className="page-eyebrow">REVENUE PIPELINE</p>
          <h2>Opportunities</h2>
          <p>Review deal value, activity, and next steps across your pipeline.</p>
        </div>
        {!showForm && !editingOpportunity && (
          <button className="btn btn-success" onClick={() => setShowForm(true)}>Add New Opportunity</button>
        )}
      </div>

      {showForm && !editingOpportunity && (
        <OpportunityForm onOpportunityAdded={handleOpportunityAdded} onCancel={handleCancelForm} />
      )}
      {editingOpportunity && (
        <OpportunityEditForm opportunity={editingOpportunity} onUpdateSuccess={handleOpportunityUpdated} onCancel={handleCancelForm} />
      )}

      <div className="form-group resource-search">
        <input type="text" placeholder="Search by title or stage..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
      </div>

      {loading ? <p>Loading opportunities...</p> : error ? <p className="error-message">{error}</p> : opportunities.length === 0 ? (
        <p>{searchTerm ? `No results for "${searchTerm}".` : "No opportunities found."}</p>
      ) : (
        <>
          <table className="table-styled resource-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Customer</th>
                <th>Value</th>
                <th>Stage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opportunity) => (
                <React.Fragment key={opportunity._id}>
                  <tr>
                    <td>{opportunity.title}</td>
                    <td>{opportunity.customer?.name || "N/A"}</td>
                    <td>${opportunity.value?.toLocaleString() || "N/A"}</td>
                    <td>{opportunity.stage}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => handleViewActivity(opportunity._id)} style={{ marginRight: "8px" }}>
                        {viewingActivityFor === opportunity._id ? 'Hide Log' : 'Activity'}
                      </button>
                      <button className="btn btn-info" onClick={() => handleViewFiles(opportunity._id)} style={{ marginRight: "8px" }}>
                        {viewingFilesFor === opportunity._id ? 'Hide Files' : 'Files'}
                      </button>
                      <button className="btn btn-primary" onClick={() => setEditingOpportunity(opportunity)} style={{ marginRight: "8px" }}>Edit</button>
                      <button className="btn btn-danger" onClick={() => openDeleteModal(opportunity._id)}>Delete</button>
                    </td>
                  </tr>
                  
                  {viewingFilesFor === opportunity._id && (
                    <tr className="details-row">
                      <td colSpan="5">
                        {loadingFiles ? <p>Loading attachments...</p> : attachedFiles.length > 0 ? (
                          <div className="file-list">
                            <h4>Attachments</h4>
                            <ul>
                              {attachedFiles.map(file => (
                                <li key={file._id}>
                                  <button className="file-download-link" onClick={() => handleDownloadFile(file)}>
                                    {file.originalname}
                                  </button>
                                  <span>({formatFileSize(file.size)})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : <p>No attachments found.</p>}
                      </td>
                    </tr>
                  )}
                  
                  {viewingActivityFor === opportunity._id && (
                    <tr className="details-row">
                      <td colSpan="5">
                        {loadingActivities ? <p>Loading activity...</p> : activities.length > 0 ? (
                          <div className="activity-feed">
                            <h4>Activity Feed</h4>
                            <ul>
                              {activities.map(activity => (
                                <li key={activity._id}>
                                  <div className="activity-actor">{activity.user?.name || 'A user'}</div>
                                  <div className="activity-description">{activity.description}</div>
                                  <div className="activity-time"><TimeAgo date={activity.createdAt} /></div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : <p>No activity logged yet.</p>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <div className="pagination-bar">
            <button className="btn btn-secondary" onClick={handlePreviousPage} disabled={currentPage <= 1}>Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button className="btn btn-secondary" onClick={handleNextPage} disabled={currentPage >= totalPages}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}

export default OpportunityList;
