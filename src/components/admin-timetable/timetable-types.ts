export type TimetableFiltersState = {
  dayOfWeek: string;
  groupId: string;
  status: "" | "active" | "archived";
  teacherUserId: string;
};

export const emptyTimetableFilters: TimetableFiltersState = {
  dayOfWeek: "",
  groupId: "",
  status: "",
  teacherUserId: "",
};
