
import ClubForm from "./ClubForm";

interface EditClubProps {
  partyId: string;
  onSuccess?: () => void;
  className?: string;
}

const EditClub = ({ partyId, onSuccess, className }: EditClubProps) => {
  return (
    <ClubForm 
      mode="edit" 
      partyId={partyId}
      onSuccess={onSuccess}
      className={className}
    />
  );
};

export default EditClub;
