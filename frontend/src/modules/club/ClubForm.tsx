import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { post, put, get } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";

// Define interfaces for API responses
interface ClubData {
  id: number;
  clubName: string;
  accountNumber: string;
  address: string;
  mobile1: string;
  mobile2: string;
  reference: string;
  referenceMobile1: string;
  referenceMobile2: string;
  createdAt: string;
  updatedAt: string;
}

const clubFormSchema = z.object({
  clubName: z.string()
    .min(1, "Club name is required")
    .max(255, "Club name must not exceed 255 characters"),
    accountNumber: z.string()
    .min(1, "Account number is required")
    .max(255, "Account number must not exceed 255 characters"),
    address: z.string()
    .min(1, "Address is required")
    .max(255, "Address must not exceed 255 characters"),
    mobile1: z.string()
    .min(1, "Mobile number is required")
    .max(255, "Mobile number must not exceed 255 characters"),
    mobile2: z.any().optional(),
    reference: z.any()
    .optional(),
    referenceMobile1: z.any()
    .optional(),
    referenceMobile2: z.any().optional(),
});

// Helper to extract user-friendly message from API error
const prettifyFieldName = (key: string): string => {
  // Remove table prefix and suffix if present
  const parts = key.split("_");
  let field = parts.length > 1 ? parts[1] : key;
  // Remove trailing 'key' or 'id'
  field = field.replace(/(key|id)$/i, "");
  // Convert camelCase to spaced words
  field = field.replace(/([A-Z])/g, " $1").trim();
  // Capitalize first letter
  return field.charAt(0).toUpperCase() + field.slice(1);
};

const extractErrorMessage = (error: any): string | undefined => {
  if (error?.errors && typeof error.errors === "object") {
    const firstKey = Object.keys(error.errors)[0];
    if (firstKey) {
      const message = error.errors[firstKey]?.message as string | undefined;
      if (message) {
        const pretty = prettifyFieldName(firstKey);
        return message.replace(firstKey, pretty);
      }
    }
  }
  return error?.message;
};

type ClubFormInputs = z.infer<typeof clubFormSchema>;

interface ClubFormProps {
  mode: "create" | "edit";
  clubId?: string;
  onSuccess?: () => void;
  className?: string;
}

const ClubForm = ({
  mode,
  clubId,
  onSuccess,
  className,
}: ClubFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Combined loading club from fetch and mutations

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ClubFormInputs>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: {
      clubName: "",
      accountNumber: "",
      address: "",
      mobile1: "",
      mobile2: "",
      reference: "",
      referenceMobile1: "",
      referenceMobile2: "",
    },
  });

  // Query for fetching club data in edit mode
  const { isLoading: isFetchingClub } = useQuery({
    queryKey: ["club", clubId],
    queryFn: async (): Promise<ClubData> => {
      if (!clubId) throw new Error("Club ID is required");
      return get(`/clubs/${clubId}`);
    },
    enabled: mode === "edit" && !!clubId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful club fetch
  useEffect(() => {
    if (mode === "edit" && clubId) {
      queryClient.fetchQuery({
        queryKey: ["club", clubId],
        queryFn: async (): Promise<ClubData> => {
          return get(`/clubs/${clubId}`);
        },
      }).then((data) => {
        setValue("clubName", data.clubName);
        setValue("accountNumber", data.accountNumber);
        setValue("address", data.address);
        setValue("mobile1", data.mobile1);
        setValue("mobile2", data.mobile2);
        setValue("reference", data.reference);
        setValue("referenceMobile1", data.referenceMobile1);
        setValue("referenceMobile2", data.referenceMobile2);
      }).catch((error) => {
        toast.error(error.message || "Failed to fetch club details");
        if (onSuccess) {
          onSuccess();
        } else {
          navigate("/clubs");
        }
      });
    }
  }, [clubId, mode, setValue, queryClient, navigate, onSuccess]);

  // Mutation for creating a club
  const createClubMutation = useMutation({
    mutationFn: (data: ClubFormInputs) => {
      return post("/clubs", data);
    },
    onSuccess: () => {
      toast.success("Club created successfully");
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/clubs");
      }
    },
    onError: (error: any) => {
      Validate(error, setError);
      const msg = extractErrorMessage(error);
      if (msg) {
        toast.error(msg);
      } else if (error.errors?.message) {
        toast.error(error.errors.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create club");
      }
    },
  });

  // Mutation for updating a club
  const updateClubMutation = useMutation({
    mutationFn: (data: ClubFormInputs) => {
      return put(`/clubs/${clubId}`, data);
    },
    onSuccess: () => {
      toast.success("Club updated successfully");
      queryClient.invalidateQueries({ queryKey: ["clubs"] });
      queryClient.invalidateQueries({ queryKey: ["club", clubId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/clubs");
      }
    },
    onError: (error: any) => {
      Validate(error, setError);
      const msg = extractErrorMessage(error);
      if (msg) {
        toast.error(msg);
      } else if (error.errors?.message) {
        toast.error(error.errors.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update club");
      }
    },
  });

  // Handle form submission
  const onSubmit: SubmitHandler<ClubFormInputs> = (data) => {
    if (mode === "create") {
      createClubMutation.mutate(data);
    } else {
      updateClubMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/clubs");
    }
  };

  // Combined loading club from fetch and mutations
  const isFormLoading = isFetchingClub || createClubMutation.isPending || updateClubMutation.isPending;

  return (
    <div className={className}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
        {/* Club Name Field */}
        <div className="grid gap-2 relative">
          <Label htmlFor="clubName" className="block mb-2">Club Name <span className="text-red-500">*</span></Label>
          <Input
            id="clubName"
            placeholder="Enter club name"
            {...register("clubName")}
            disabled={isFormLoading}
          />
          {errors.clubName && (
            <span className="mt-1 block text-xs text-destructive">
              {errors.clubName.message}
            </span>
          )}

          {/* Account Number Field */}
          <div className="grid gap-2 relative">
            <Label htmlFor="accountNumber" className="block mb-2">Account Number <span className="text-red-500">*</span></Label>
            <Input
              id="accountNumber"
              placeholder="Enter account number"
              {...register("accountNumber")}
              disabled={isFormLoading}
            />
            {errors.accountNumber && (
              <span className="mt-1 block text-xs text-destructive">
                {errors.accountNumber.message}
              </span>
            )}
          </div>

         
            <Label htmlFor="address" className="block mb-2">Address <span className="text-red-500">*</span></Label>
            <Input
              id="address"
              placeholder="Enter address"
              {...register("address")}
              disabled={isFormLoading}
            />
            {errors.address && (
              <span className="mt-1 block text-xs text-destructive">
                {errors.address.message}
              </span>
            )}


            <div className="grid grid-cols-2 gap-4">
              <div>
            {/* Mobile 1 Field */}
            <Label htmlFor="mobile1" className="block mb-2">Mobile 1 <span className="text-red-500">*</span></Label>
            <Input
              id="mobile1"
              placeholder="Enter mobile number"
              {...register("mobile1")}
              disabled={isFormLoading}
              maxLength={10}
type="tel"
            />
            {errors.mobile1 && (
              <span className="mt-1 block text-xs text-destructive">
                {errors.mobile1.message}
              </span>
            )}
            </div>
            <div>
            {/* Mobile 2 Field */}
            <Label htmlFor="mobile2" className="block mb-2">Mobile 2</Label>
            <Input
              id="mobile2"
              placeholder="Enter mobile number"
              {...register("mobile2")}
              disabled={isFormLoading}
              maxLength={10}
type="tel"
            />
            {errors.mobile2 && (
              <span className="mt-1 block text-xs text-destructive">
                {errors.mobile2.message}
              </span>
            )}
            </div>
            </div>

            {/* Reference Field */}
            <Label htmlFor="reference" className="block mb-2">Reference</Label>
            <Input
              id="reference"
              placeholder="Enter reference"
              {...register("reference")}
              disabled={isFormLoading}
            />
            {errors.reference && (
              <span className="mt-1 block text-xs text-destructive">
                {errors.reference.message}
              </span>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                {/* Reference Mobile 1 Field */}
                <Label htmlFor="referenceMobile1" className="block mb-2">Reference Mobile 1</Label>
                <Input
                  id="referenceMobile1"
                  placeholder="Enter reference mobile number"
                  {...register("referenceMobile1")}
                  disabled={isFormLoading}
                  maxLength={10}
                  type="tel"
                />
                {errors.referenceMobile1 && (
                  <span className="mt-1 block text-xs text-destructive">
                    {errors.referenceMobile1.message}
                  </span>
                )}
              </div>
              <div>
                {/* Reference Mobile 2 Field */}
                <Label htmlFor="referenceMobile2" className="block mb-2">Reference Mobile 2</Label>
                <Input
                  id="referenceMobile2"
                  placeholder="Enter reference mobile number"
                  {...register("referenceMobile2")}
                  disabled={isFormLoading}
                  maxLength={10}
                  type="tel"
                 />
                {errors.referenceMobile2 && (
                  <span className="mt-1 block text-xs text-destructive">
                    {errors.referenceMobile2.message}
                  </span>
                )}
              </div>
            </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isFormLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isFormLoading}>
            {isFormLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create" : "Update"} Club
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClubForm;
