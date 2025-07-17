import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Services and utilities
import { post, put, get } from "@/services/apiService";
import Validate from "@/lib/Handlevalidation";

// Define interfaces for API responses
interface CompetitionData {
  id: number;
  competitionName: string;
  date: string;
  age: string;
  lastEntryDate: string;
  createdAt: string;
  updatedAt: string;
}

// Create schema for competition form
const competitionFormSchema = z.object({
  competitionName: z.string()
    .min(1, "Competition name is required")
    .max(255, "Competition name must not exceed 255 characters"),
  date: z.string()
    .min(1, "Date is required")
    .max(255, "Date must not exceed 255 characters"),
  age: z.string()
    .min(1, "Age is required")
    .max(255, "Age must not exceed 255 characters"),
  lastEntryDate: z.string()
    .min(1, "Last entry date is required")
    .max(255, "Last entry date must not exceed 255 characters"),
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

type CompetitionFormInputs = z.infer<typeof competitionFormSchema>;

interface CompetitionFormProps {
  mode: "create" | "edit";
  competitionId?: string;
  onSuccess?: () => void;
  className?: string;
}

const CompetitionForm = ({
  mode,
  competitionId,
  onSuccess,
  className,
}: CompetitionFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize form with Shadcn Form
  const form = useForm<CompetitionFormInputs>({
    resolver: zodResolver(competitionFormSchema),
    defaultValues: {
      competitionName: "",
      date: "",
      age: "",
      lastEntryDate: "",
    },
  });

  // Query for fetching competition data in edit mode
  const { data: competitionData, isLoading: isFetchingCompetition, error: fetchError } = useQuery({
    queryKey: ["competition", competitionId],
    queryFn: async (): Promise<CompetitionData> => {
      if (!competitionId) throw new Error("Competition ID is required");
      const response = await get(`/competitions/${competitionId}`);
      console.log("Competition API response:", response); // Debug log
      // Handle different response structures
      return response.competition || response;
    },
    enabled: mode === "edit" && !!competitionId,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Handle successful competition fetch
  useEffect(() => {
    console.log("Competition data received:", competitionData); // Debug log
    if (competitionData && mode === "edit") {
      console.log("Setting form values..."); // Debug log
      form.setValue("competitionName", competitionData.competitionName || "");
      form.setValue("date", competitionData.date || "");
      form.setValue("age", competitionData.age || "");
      form.setValue("lastEntryDate", competitionData.lastEntryDate || "");
    }
  }, [competitionData, mode, form]);

  // Handle fetch error
  useEffect(() => {
    if (fetchError && mode === "edit") {
      toast.error(fetchError.message || "Failed to fetch competition details");
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/competitions");
      }
    }
  }, [fetchError, mode, onSuccess, navigate]);

  // Mutation for creating a competition
  const createCompetitionMutation = useMutation({
    mutationFn: (data: CompetitionFormInputs) => {
      return post("/competitions", data);
    },
    onSuccess: () => {
      toast.success("Competition created successfully");
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/competitions");
      }
    },
    onError: (error: any) => {
      Validate(error, form.setError);
      const msg = extractErrorMessage(error);
      if (msg) {
        toast.error(msg);
      } else if (error.errors?.message) {
        toast.error(error.errors.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create competition");
      }
    },
  });

  // Mutation for updating a competition
  const updateCompetitionMutation = useMutation({
    mutationFn: (data: CompetitionFormInputs) => {
      return put(`/competitions/${competitionId}`, data);
    },
    onSuccess: () => {
      toast.success("Competition updated successfully");
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      queryClient.invalidateQueries({ queryKey: ["competition", competitionId] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/competitions");
      }
    },
    onError: (error: any) => {
      Validate(error, form.setError);
      const msg = extractErrorMessage(error);
      if (msg) {
        toast.error(msg);
      } else if (error.errors?.message) {
        toast.error(error.errors.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update competition");
      }
    },
  });

  // Handle form submission
  const onSubmit = (data: CompetitionFormInputs) => {
    if (mode === "create") {
      createCompetitionMutation.mutate(data);
    } else {
      updateCompetitionMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess();
    } else {
      navigate("/competitions");
    }
  };

  // Combined loading competition from fetch and mutations
  const isFormLoading = isFetchingCompetition || createCompetitionMutation.isPending || updateCompetitionMutation.isPending;

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
          {/* Competition Name Field */}
          <FormField
            control={form.control}
            name="competitionName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Competition Name <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter competition name" 
                    {...field} 
                    disabled={isFormLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date Field */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter date (e.g., YYYY-MM-DD)" 
                    {...field} 
                    disabled={isFormLoading}
                    type="date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Age Field */}
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter age requirement (e.g., Under 18)" 
                    {...field} 
                    disabled={isFormLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Last Entry Date Field */}
          <FormField
            control={form.control}
            name="lastEntryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Entry Date <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter last entry date (e.g., YYYY-MM-DD)" 
                    {...field} 
                    disabled={isFormLoading}
                    type="date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
              {mode === "create" ? "Create" : "Update"} Competition
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CompetitionForm;