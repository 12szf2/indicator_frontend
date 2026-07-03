import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

const getCurrentSchoolYearStart = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  return currentMonth >= 9 ? currentYear : currentYear - 1;
};

// Define a service using a base URL and expected endpoints
export const indicatorApi = createApi({
  reducerPath: "indicatorApi",
  baseQuery: baseQueryWithReauth,
  keepUnusedDataFor: 0, // Don't keep any unused data
  refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
  refetchOnReconnect: true, // Refetch when reconnecting
  refetchOnFocus: false, // Disable to prevent excessive refetching and race conditions
  tagTypes: [
    "User",
    "TanugyiAdatok",
    "AlkalmazottAdatok",
    "Alapadatok",
    "Kompetencia",
    "TanuloLetszam",
    "TableList",
    "Elhelyezkedes",
    "FelvettekSzama",
    "SajatosNevelesuTanulok",
    "HHesHHHNevelesuTanulok",
    "Vizsgaeredmenyek",
    "SzakmaiVizsgaEredmenyek",
    "SzakmaiRendezvenyek",
    "SzakkepzesiMunszerzodesArany",
    "Muhelyiskola",
    "Lemorzsolodas",
    "NSZFH",
    "SZMSZ",
    "EgyOktatoraJutoTanulo",
    "IntezmenyiNeveltsegiMutatok",
    "Dobbanto",
    "Logs",
    "OktatokEgyebTev",
    "Szakirany",
    "Szakma",
    "TanuloAdatszolgaltatas",
    "OktatoAdatszolgaltatas",
    "Changelog",
    "Hianyzas",
    "SzakmaiTovabbkepzesek",
    "Versenyek",
    "Elegedettseg",
    "ElegedettsegMeres",
    "VersenyKategoria",
    "IntezményiElismeresek",
    "MunkavallalokElismeresek",
    "Palyazatok",
    "Szervezetfejlesztes",
    "DualisKepzohelyek",
    "InnovaciosTevekenysegek",
    "SzakkepzesZolditese",
    "DigitalisKompetencia",
    "TanulmanyiEredmeny",
    "PalyaOrientacio",
    "EgyuttmukodesekSzama",
    "NyelvvizsgakSzama",
    "FormHistory",
    "BugReports",
  ],
  endpoints: (build) => ({
    // Authentication endpoints
    login: build.mutation({
      query: (credentials) => ({
        url: "auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    googleLogin: build.mutation({
      query: (credentials) => ({
        url: "auth/google-login",
        method: "POST",
        body: credentials,
      }),
    }),
    logout: build.mutation({
      query: () => ({
        url: "auth/logout",
        method: "POST",
      }),
    }),
    refreshToken: build.mutation({
      query: (refreshToken) => ({
        url: "auth/refresh",
        method: "POST",
        body: { refreshToken },
      }),
    }),
    forgotPassword: build.mutation({
      query: ({ email }) => ({
        url: "auth/forgot-password",
        method: "POST",
        body: { email },
      }),
    }),
    submitBugReport: build.mutation({
      query: (reportData) => ({
        url: "bug-report",
        method: "POST",
        body: reportData,
      }),
    }),
    getReportedBugs: build.query({
      query: () => "bug-report",
      providesTags: ["BugReports"],
    }),
    updateBugStatus: build.mutation({
      query: ({ id, status }) => ({
        url: `bug-report/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["BugReports"],
    }),
    // User management endpoints
    getUsers: build.query({
      query: () => "users/",
      providesTags: ["User"],
    }),
    getFilteredUsers: build.query({
      query: () => "users/filtered",
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: "User", id })), "User"]
          : ["User"],
    }),
    getUserById: build.query({
      query: (id) => `users/${id}`,
      providesTags: (result, error, id) => [{ type: "User", id }],
    }),
    addUser: build.mutation({
      query: (userData) => ({
        url: "users/",
        method: "POST",
        body: userData,
      }),
      invalidatesTags: ["User"],
    }),
    updateUser: build.mutation({
      query: ({ id, ...userData }) => ({
        url: `users/${id}`,
        method: "PUT",
        body: userData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "User", id }],
    }),
    deleteUser: build.mutation({
      query: (id) => ({
        url: `users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
    changeUserPassword: build.mutation({
      query: ({ id, newPassword, newPasswordConfirm }) => ({
        url: `users/${id}/password`,
        method: "PUT",
        body: {
          id,
          newPassword,
          newPasswordConfirm,
        },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "User", id }],
    }),
    disable2FAForUser: build.mutation({
      query: (id) => ({
        url: `users/${id}/disable-2fa`,
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    updateMe: build.mutation({
      query: (userData) => ({
        url: `me/personal`,
        method: "PUT",
        body: userData,
      }),
      invalidatesTags: ["User"],
    }),
    changeMePassword: build.mutation({
      query: ({ newPassword, newPasswordConfirm }) => ({
        url: `me/password`,
        method: "PUT",
        body: {
          newPassword,
          newPasswordConfirm,
        },
      }),
      invalidatesTags: ["User"],
    }),
    generate2FA: build.mutation({
      query: () => ({
        url: `auth/2fa/generate`,
        method: "POST",
      }),
    }),
    verify2FA: build.mutation({
      query: ({ token }) => ({
        url: `auth/2fa/verify`,
        method: "POST",
        body: { token },
      }),
      invalidatesTags: ["User"],
    }),
    disable2FA: build.mutation({
      query: () => ({
        url: `auth/2fa/disable`,
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    getTanugyiAdatok: build.query({
      query: (params) => `tanugyi_adatok/${params.alapadatok_id}/${params.ev}`,
      providesTags: (result, error, params) => [
        { type: "TanugyiAdatok", id: `${params.alapadatok_id}_${params.ev}` },
      ],
    }),
    getEngedelyezettOratomeg: build.query({
      query: (params) => `engedelyezett_oratomeg/${params.alapadatok_id}/${params.tanev_kezdete}`,
      providesTags: (result, error, params) => [
        { type: "EngedelyezettOratomeg", id: `${params.alapadatok_id}_${params.tanev_kezdete}` },
      ],
    }),
    upsertEngedelyezettOratomeg: build.mutation({
      query: (data) => ({
        url: `engedelyezett_oratomeg`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { alapadatok_id, tanev_kezdete }) => [
        { type: "EngedelyezettOratomeg", id: `${alapadatok_id}_${tanev_kezdete}` },
      ],
    }),
    getAlapadatok: build.query({
      query: (params) => `alapadatok/${params.id}`,
      providesTags: (result, error, params) => [
        { type: "Alapadatok", id: params.id },
      ],
    }),
    getAllAlapadatok: build.query({
      query: () => `alapadatok/`,
      providesTags: ["Alapadatok"],
    }),
    addAlapadatok: build.mutation({
      query: (schoolData) => ({
        url: "alapadatok/",
        method: "POST",
        body: schoolData,
      }),
      invalidatesTags: ["Alapadatok"],
    }),
    updateAlapadatok: build.mutation({
      query: ({ id, ...schoolData }) => ({
        url: `alapadatok/${id}`,
        method: "PUT",
        body: schoolData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Alapadatok", id },
        "Alapadatok",
      ],
    }),
    deleteAlapadatok: build.mutation({
      query: (id) => ({
        url: `alapadatok/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Alapadatok"],
    }),
    getKompetencia: build.query({
      query: (params) => `kompetencia/${params.id}`,
      providesTags: (result, error, params) => [
        { type: "Kompetencia", id: params.id },
      ],
    }),
    getTanuloLetszam: build.query({
      query: (params) => `tanulo_letszam/${params.alapadatok_id}`,
      providesTags: (result, error, params) => [
        { type: "TanuloLetszam", id: params.alapadatok_id },
      ],
    }),
    addTanuloLetszamBulk: build.mutation({
      query: (params) => ({
        url: "tanulo_letszam/bulk",
        method: "POST",
        body: {
          alapadatok_id: params.alapadatok_id,
          records: params.records,
        },
      }),
      invalidatesTags: (result, error, params) => [
        { type: "TanuloLetszam", id: params.alapadatok_id },
        "TanuloLetszam",
        "TanugyiAdatok",
      ],
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            indicatorApi.util.invalidateTags([
              "TanuloLetszam",
              "TanugyiAdatok",
            ]),
          );
        } catch (e) {
          console.error("Error in addTanuloLetszamBulk onQueryStarted:", e);
        }
      },
    }),
    addTanuloLetszam: build.mutation({
      query: (params) => ({
        url: "tanulo_letszam/",
        method: "POST",
        body: {
          alapadatok_id: params.alapadatok_id,
          letszam: params.letszam,
          jogv_tipus: params.jogv_tipus,
          szakirany: params.szakirany,
          szakma: params.szakma,
          tanev_kezdete: params.tanev_kezdete,
        },
      }),
      invalidatesTags: (result, error, params) => [
        { type: "TanuloLetszam", id: params.alapadatok_id },
        "TanuloLetszam", // Invalidate all TanuloLetszam queries
        "TanugyiAdatok", // Also invalidate related data
      ],
      // Force refetch after successful mutation
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Force refetch of related queries
          dispatch(
            indicatorApi.util.invalidateTags([
              "TanuloLetszam",
              "TanugyiAdatok",
            ]),
          );
        } catch (e) {
          console.error("Error in addTanuloLetszam onQueryStarted:", e);
        }
      },
    }),
    updateTanuloLetszam: build.mutation({
      query: (params) => ({
        url: `tanulo_letszam/${params.id}`,
        method: "PUT",
        body: {
          alapadatok_id: params.alapadatok_id,
          letszam: params.letszam,
          jogv_tipus: params.jogv_tipus,
          szakirany: params.szakirany,
          szakma: params.szakma,
          tanev_kezdete: params.tanev_kezdete,
        },
      }),
      invalidatesTags: (result, error, params) => [
        { type: "TanuloLetszam", id: params.alapadatok_id },
        "TanuloLetszam", // Invalidate all TanuloLetszam queries
        "TanugyiAdatok", // Also invalidate related data
      ],
      // Force refetch after successful mutation
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Force refetch of related queries
          dispatch(
            indicatorApi.util.invalidateTags([
              "TanuloLetszam",
              "TanugyiAdatok",
            ]),
          );
        } catch (e) {
          console.error("Error in updateTanuloLetszam onQueryStarted:", e);
        }
      },
    }),
    addTanugyiAdatok: build.mutation({
      query: (params) => ({
        url: "tanugyi_adatok/",
        method: "POST",
        body: {
          alapadatok_id: params.alapadatok_id,
          tanugyi_adatok: params.tanugyi_adatok,
          userId: params.userId,
        },
      }),
      invalidatesTags: (result, error, params) => [
        {
          type: "TanugyiAdatok",
          id: `${params.alapadatok_id}_${params.tanev_kezdete || "all"}`,
        },
        "TanugyiAdatok",
        "TanuloLetszam", // Also invalidate related student data
      ],
      // Force refetch after successful mutation
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Force refetch of related queries
          dispatch(
            indicatorApi.util.invalidateTags([
              "TanugyiAdatok",
              "TanuloLetszam",
            ]),
          );
        } catch (e) {
          console.error("Error in addTanugyiAdatok onQueryStarted:", e);
        }
      },
    }),
    addAlkalmazottAdatok: build.mutation({
      query: (params) => ({
        url: "alkalmazottak_munkaugy/",
        method: "POST",
        body: {
          alapadatok_id: params.alapadatok_id,
          alkalmazottak_munkaugy: params.alkalmazottak_munkaugy,
        },
      }),
      invalidatesTags: ["AlkalmazottAdatok"],
    }),
    getAlkalmazottAdatok: build.query({
      query: (params) =>
        `alkalmazottak_munkaugy/${params.alapadatok_id}/${params.tanev_kezdete}`,
      providesTags: (result, error, params) => [
        {
          type: "AlkalmazottAdatok",
          id: `${params.alapadatok_id}_${params.tanev_kezdete}`,
        },
      ],
    }),
    addKompetencia: build.mutation({
      query: (params) => ({
        url: "kompetencia/",
        method: "POST",
        body: {
          alapadatok_id: params.alapadatok_id,
          tanev_kezdete: params.tanev_kezdete,
          mat_orsz_p: params.mat_orsz_p,
          szoveg_orsz_p: params.szoveg_orsz_p,
          mat_int_p: params.mat_int_p,
          szoveg_int_p: params.szoveg_int_p,
          kepzes_forma: params.kepzes_forma,
        },
      }),
      invalidatesTags: (result, error, params) => [
        { type: "Kompetencia", id: params.alapadatok_id },
      ],
    }),
    updateKompetencia: build.mutation({
      query: (params) => ({
        url: `kompetencia`,
        method: "PUT",
        body: {
          alapadatok_id: params.alapadatok_id,
          tanev_kezdete: params.tanev_kezdete,
          mat_orsz_p: params.mat_orsz_p,
          szoveg_orsz_p: params.szoveg_orsz_p,
          mat_int_p: params.mat_int_p,
          szoveg_int_p: params.szoveg_int_p,
          kepzes_forma: params.kepzes_forma,
          id: params.id,
        },
      }),
      invalidatesTags: (result, error, params) => [
        { type: "Kompetencia", id: params.alapadatok_id },
      ],
    }),
    getTanuloAdatszolgaltatas: build.query({
      query: (params) =>
        `tanulo_adatszolgaltatas/${params.alapadatok_id}/${params.tanev_kezdete}`,
      providesTags: (result, error, params) => [
        {
          type: "TanuloAdatszolgaltatas",
          id: `${params.alapadatok_id}_${params.tanev_kezdete}`,
        },
      ],
    }),
    addTanuloAdatszolgaltatas: build.mutation({
      query: (params) => ({
        url: "tanulo_adatszolgaltatas/",
        method: "POST",
        body: {
          alapadatok_id: params.alapadatok_id,
          tanev_kezdete: params.tanev_kezdete,
          tanulo_adatszolgaltatas: params.tanulo_adatszolgaltatas,
        },
      }),
      invalidatesTags: ["TanuloAdatszolgaltatas"],
    }),
    getOktatoAdatszolgaltatas: build.query({
      query: (params) =>
        `oktato_adatszolgaltatas/${params.alapadatok_id}/${params.tanev_kezdete}`,
      providesTags: (result, error, params) => [
        {
          type: "OktatoAdatszolgaltatas",
          id: `${params.alapadatok_id}_${params.tanev_kezdete}`,
        },
      ],
    }),
    addOktatoAdatszolgaltatas: build.mutation({
      query: (params) => ({
        url: "oktato_adatszolgaltatas/",
        method: "POST",
        body: {
          alapadatok_id: params.alapadatok_id,
          tanev_kezdete: params.tanev_kezdete,
          oktato_adatszolgaltatas: params.oktato_adatszolgaltatas,
        },
      }),
      invalidatesTags: ["OktatoAdatszolgaltatas"],
    }),
    // Table management endpoints
    getTableList: build.query({
      query: () => "tablelist",
      providesTags: ["TableList"],
    }),
    createTable: build.mutation({
      query: (newTable) => ({
        url: "tablelist",
        method: "POST",
        body: newTable,
      }),
      invalidatesTags: ["TableList"],
    }),
    updateTable: build.mutation({
      query: ({ id, ...updatedTable }) => ({
        url: `tablelist/${id}`,
        method: "PUT",
        body: updatedTable,
      }),
      invalidatesTags: ["TableList"],
    }),
    // Lock/unlock table mutations
    lockTable: build.mutation({
      query: (tableId) => ({
        url: `tablelist/${tableId}/lock`,
        method: "POST",
      }),
      invalidatesTags: ["TableList"],
    }),
    unlockTable: build.mutation({
      query: (tableId) => ({
        url: `tablelist/${tableId}/unlock`,
        method: "POST",
      }),
      invalidatesTags: ["TableList"],
    }),

    // ========== Educational Indicators Endpoints ==========

    // Elhelyezkedési mutato (Graduate Placement)
    getElhelyezkedesByYear: build.query({
      query: (tanev) => `elhelyezkedes/${tanev}`,
      providesTags: (result, error, tanev) => [
        { type: "Elhelyezkedes", id: tanev },
      ],
    }),
    getElhelyezkedesBySchoolAndYear: build.query({
      query: ({ alapadatokId, tanev }) =>
        `elhelyezkedes/${alapadatokId}/${tanev}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "Elhelyezkedes", id: `${alapadatokId}-${tanev}` },
      ],
    }),
    getAllElhelyezkedes: build.query({
      query: () => `elhelyezkedes/${getCurrentSchoolYearStart()}`,
      providesTags: ["Elhelyezkedes"],
    }),
    addElhelyezkedes: build.mutation({
      query: (data) => ({
        url: "elhelyezkedes",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Elhelyezkedes"],
    }),
    updateElhelyezkedes: build.mutation({
      query: ({ id, ...data }) => ({
        url: `elhelyezkedes/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Elhelyezkedes"],
    }),
    deleteElhelyezkedes: build.mutation({
      query: (id) => ({
        url: `elhelyezkedes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Elhelyezkedes"],
    }),
    deleteElhelyezkedesBySchoolAndYear: build.mutation({
      query: ({ alapadatokId, tanev }) => ({
        url: `elhelyezkedes/${alapadatokId}/${tanev}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Elhelyezkedes"],
    }),

    // Hianyzas
    getHianyzas: build.query({
      query: ({ alapadatok_id, tanev }) => `hianyzas/${alapadatok_id}/${tanev}`,
      providesTags: (result, error, { alapadatok_id, tanev }) => [
        { type: "Hianyzas", id: `${alapadatok_id}-${tanev}` },
        "Hianyzas",
      ],
    }),
    addHianyzas: build.mutation({
      query: (data) => ({
        url: "hianyzas",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Hianyzas"],
    }),
    updateHianyzas: build.mutation({
      query: ({ id, ...data }) => ({
        url: `hianyzas/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Hianyzas"],
    }),
    // Tanulmányi Eredmény (Academic Results - Indicator 25)
    getTanulmanyiEredmeny: build.query({
      query: ({ alapadatok_id }) => `tanulmanyi_eredmeny/${alapadatok_id}`,
      providesTags: (result, error, { alapadatok_id }) => [
        { type: "TanulmanyiEredmeny", id: alapadatok_id },
        "TanulmanyiEredmeny",
      ],
    }),
    addTanulmanyiEredmeny: build.mutation({
      query: (data) => ({
        url: "tanulmanyi_eredmeny",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["TanulmanyiEredmeny"],
    }),
    updateTanulmanyiEredmeny: build.mutation({
      query: ({ id, ...data }) => ({
        url: `tanulmanyi_eredmeny/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["TanulmanyiEredmeny"],
    }),

    // Szakmai továbbképzések endpoints
    getSzakmaiTovabbkepzesek: build.query({
      query: (params) => `szakmai_tovabbkepzes/${params.alapadatok_id}/${params.tanev}`,
      providesTags: (result, error, params) => [
        { type: "SzakmaiTovabbkepzesek", id: `${params.alapadatok_id}-${params.tanev}` },
        "SzakmaiTovabbkepzesek",
      ],
    }),
    getSzakmaiTovabbkepzesekBySchool: build.query({
      query: (alapadatok_id) => `szakmai_tovabbkepzes/${alapadatok_id}`,
      providesTags: (result, error, alapadatok_id) => [
        { type: "SzakmaiTovabbkepzesek", id: alapadatok_id },
        "SzakmaiTovabbkepzesek",
      ],
    }),
    addSzakmaiTovabbkepzes: build.mutation({
      query: (data) => ({
        url: "szakmai_tovabbkepzes",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SzakmaiTovabbkepzesek"],
    }),
    updateSzakmaiTovabbkepzes: build.mutation({
      query: ({ id, ...data }) => ({
        url: `szakmai_tovabbkepzes/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SzakmaiTovabbkepzesek"],
    }),

    // Felvettek_szama (Admissions)
    getAllFelvettekSzama: build.query({
      query: () => "felvettek_szama",
      providesTags: ["FelvettekSzama"],
    }),
    getFelvettekSzamaByAlapadatokIdAndYear: build.query({
      query: ({ alapadatokId, year }) =>
        `felvettek_szama/${alapadatokId}/${year}`,
      providesTags: (result, error, { alapadatokId, year }) => [
        { type: "FelvettekSzama", id: `${alapadatokId}-${year}` },
      ],
    }),
    addFelvettekSzama: build.mutation({
      query: (data) => ({
        url: "felvettek_szama",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["FelvettekSzama"],
    }),
    updateFelvettekSzama: build.mutation({
      query: ({ id, ...data }) => ({
        url: `felvettek_szama/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["FelvettekSzama"],
    }),
    deleteFelvettekSzama: build.mutation({
      query: (id) => ({
        url: `felvettek_szama/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FelvettekSzama"],
    }),

    // Sajatos_nevelesu_tanulok (Special Needs Students)
    getSajatosNevelesuTanulokByYear: build.query({
      query: (tanev) => `sajatos_nevelesu_tanulok/${tanev}`,
      providesTags: (result, error, tanev) => [
        { type: "SajatosNevelesuTanulok", id: tanev },
      ],
    }),
    getAllSajatosNevelesuTanulok: build.query({
      query: (alapadatok_id) =>
        `sajatos_nevelesu_tanulok/${alapadatok_id}/${getCurrentSchoolYearStart()}`,
      providesTags: ["SajatosNevelesuTanulok"],
    }),
    addSajatosNevelesuTanulok: build.mutation({
      query: (data) => ({
        url: "sajatos_nevelesu_tanulok",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SajatosNevelesuTanulok"],
    }),
    updateSajatosNevelesuTanulok: build.mutation({
      query: ({ id, ...data }) => ({
        url: `sajatos_nevelesu_tanulok/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SajatosNevelesuTanulok"],
    }),
    deleteSajatosNevelesuTanulok: build.mutation({
      query: (id) => ({
        url: `sajatos_nevelesu_tanulok/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SajatosNevelesuTanulok"],
    }),

    // HH_es_HHH_nevelesu_tanulok (Disadvantaged Students)
    getHHesHHHNevelesuTanulokByYear: build.query({
      query: (tanev) => `hh_es_hhh/${tanev}`,
      providesTags: (result, error, tanev) => [
        { type: "HHesHHHNevelesuTanulok", id: tanev },
      ],
    }),
    getAllHHesHHHNevelesuTanulok: build.query({
      query: () => `hh_es_hhh/${getCurrentSchoolYearStart()}`,
      providesTags: ["HHesHHHNevelesuTanulok"],
    }),
    addHHesHHHNevelesuTanulok: build.mutation({
      query: (data) => ({
        url: `hh_es_hhh`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["HHesHHHNevelesuTanulok"],
    }),
    updateHHesHHHNevelesuTanulok: build.mutation({
      query: ({ id, ...data }) => ({
        url: `hh_es_hhh/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["HHesHHHNevelesuTanulok"],
    }),
    deleteHHesHHHNevelesuTanulok: build.mutation({
      query: (id) => ({
        url: `hh_es_hhh/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["HHesHHHNevelesuTanulok"],
    }),

    getVizsgaeredmenyekBySchoolAndYear: build.query({
      query: ({ alapadatokId, tanev }) => `vizsgaeredmenyek/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "Vizsgaeredmenyek", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "Vizsgaeredmenyek"
      ],
    }),
    getAllVizsgaeredmenyek: build.query({
      query: () => `vizsgaeredmenyek/${getCurrentSchoolYearStart()}`,
      providesTags: ["Vizsgaeredmenyek"],
    }),
    addVizsgaeredmenyek: build.mutation({
      query: (data) => ({
        url: "vizsgaeredmenyek",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Vizsgaeredmenyek"],
    }),
    updateVizsgaeredmenyek: build.mutation({
      query: ({ id, ...data }) => ({
        url: `vizsgaeredmenyek/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Vizsgaeredmenyek"],
    }),
    deleteVizsgaeredmenyek: build.mutation({
      query: (id) => ({
        url: `vizsgaeredmenyek/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Vizsgaeredmenyek"],
    }),

    getLemorzsolodasBySchoolAndYear: build.query({
      query: ({ alapadatokId, tanev }) => `lemorzsolodas/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "Lemorzsolodas", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "Lemorzsolodas"
      ],
    }),
    getAllLemorzsolodas: build.query({
      query: () => `lemorzsolodas/${getCurrentSchoolYearStart()}`,
      providesTags: ["Lemorzsolodas"],
    }),
    addLemorzsolodas: build.mutation({
      query: (data) => ({
        url: "lemorzsolodas",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Lemorzsolodas"],
    }),
    updateLemorzsolodas: build.mutation({
      query: ({ id, ...data }) => ({
        url: `lemorzsolodas/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Lemorzsolodas"],
    }),
    deleteLemorzsolodas: build.mutation({
      query: ({ alapadatokId, tanev }) => ({
        url: `lemorzsolodas/${alapadatokId}/${tanev}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Lemorzsolodas"],
    }),

    // Szakmai_rendezvenyek (Indicator 14)
    getSzakmaiRendezvenyekByYear: build.query({
      query: (tanev) => `szakmairendezvenyek/${tanev}`,
      providesTags: (result, error, tanev) => [
        { type: "SzakmaiRendezvenyek", id: tanev },
      ],
    }),
    getSzakmaiRendezvenyekBySchoolAndYear: build.query({
      query: ({ alapadatokId, tanev }) => `szakmairendezvenyek/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "SzakmaiRendezvenyek", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "SzakmaiRendezvenyek"
      ],
    }),
    addSzakmaiRendezvenyek: build.mutation({
      query: (data) => ({
        url: "szakmairendezvenyek",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SzakmaiRendezvenyek"],
    }),
    updateSzakmaiRendezvenyek: build.mutation({
      query: ({ id, ...data }) => ({
        url: `szakmairendezvenyek/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SzakmaiRendezvenyek"],
    }),
    deleteSzakmaiRendezvenyek: build.mutation({
      query: (id) => ({
        url: `szakmairendezvenyek/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SzakmaiRendezvenyek"],
    }),

    // Szakmai_vizsga_eredmenyek (Professional Exam Results)
    getSzakmaiVizsgaEredmenyekByYear: build.query({
      query: (tanev) => `szakmai_vizsga_eredmenyek/${tanev}`,
      providesTags: (result, error, tanev) => [
        { type: "SzakmaiVizsgaEredmenyek", id: tanev },
      ],
    }),
    getAllSzakmaiVizsgaEredmenyek: build.query({
      query: () => `szakmai_vizsga_eredmenyek/${getCurrentSchoolYearStart()}`,
      providesTags: ["SzakmaiVizsgaEredmenyek"],
    }),
    addSzakmaiVizsgaEredmenyek: build.mutation({
      query: (data) => ({
        url: "szakmai_vizsga_eredmenyek",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SzakmaiVizsgaEredmenyek"],
    }),
    updateSzakmaiVizsgaEredmenyek: build.mutation({
      query: ({ id, ...data }) => ({
        url: `szakmai_vizsga_eredmenyek/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SzakmaiVizsgaEredmenyek"],
    }),
    deleteSzakmaiVizsgaEredmenyek: build.mutation({
      query: (id) => ({
        url: `szakmai_vizsga_eredmenyek/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SzakmaiVizsgaEredmenyek"],
    }),

    // Versenyek (Szakmai Eredmények - Indicator 8)
    getAllVersenyek: build.query({
      query: (tanev) => `versenyek/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: ["Versenyek"],
    }),
    getVersenyekByAlapadatok: build.query({
      query: ({ alapadatokId, tanev }) => `versenyek/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: ["Versenyek"],
    }),
    // Muhelyiskola (Workshop Schools)
    getMuhelyiskola: build.query({
      query: ({ tanev } = {}) => {
        // Always use the tanev parameter if provided, otherwise default to current year
        const yearToUse = tanev || new Date().getFullYear();
        return `muhelyiskola/${yearToUse}`;
      },
      providesTags: (result, error, params = {}) => [
        { type: "Muhelyiskola", id: params.alapadatok_id || "all" },
        "Muhelyiskola",
      ],
    }),
    addMuhelyiskola: build.mutation({
      query: (data) => ({
        url: "muhelyiskola",
        method: "POST",
        body: {
          alapadatok_id: data.alapadatok_id,
          tanev_kezdete: data.tanev_kezdete,
          reszszakmat_szerezok_szama: data.reszszakmat_szerezok_szama,
          muhelyiskola_tanuloi_osszletszam:
            data.muhelyiskola_tanuloi_osszletszam,
        },
      }),
      invalidatesTags: (result, error, data) => [
        { type: "Muhelyiskola", id: data.alapadatok_id },
        "Muhelyiskola",
      ],
    }),
    updateMuhelyiskola: build.mutation({
      query: ({ id, ...data }) => ({
        url: `muhelyiskola/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { alapadatok_id }) => [
        { type: "Muhelyiskola", id: alapadatok_id },
        "Muhelyiskola",
      ],
    }),
    deleteMuhelyiskola: build.mutation({
      query: (id) => ({
        url: `muhelyiskola/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Muhelyiskola"],
    }),

    // NSZFH (National Skills Framework)
    getNSZFHByYear: build.query({
      query: (tanev) => `nszfh/${tanev}`,
      providesTags: (result, error, tanev) => [{ type: "NSZFH", id: tanev }],
    }),
    getNSZFHBySchoolAndYear: build.query({
      query: ({ alapadatokId, tanev }) => `nszfh/${alapadatokId}/${tanev}`,
      providesTags: ["NSZFH"],
    }),
    getAllNSZFH: build.query({
      query: () => `nszfh/${getCurrentSchoolYearStart()}`,
      providesTags: ["NSZFH"],
    }),
    addNSZFH: build.mutation({
      query: (data) => ({
        url: "nszfh",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["NSZFH"],
    }),
    updateNSZFH: build.mutation({
      query: ({ id, ...data }) => ({
        url: `nszfh/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["NSZFH"],
    }),
    deleteNSZFH: build.mutation({
      query: (id) => ({
        url: `nszfh/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["NSZFH"],
    }),

    // Changelog endpoints
    getChangelog: build.query({
      query: () => "changelog",
      providesTags: ["Changelog"],
    }),
    addChangelogEntry: build.mutation({
      query: (data) => ({
        url: "changelog",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Changelog"],
    }),
    updateChangelogEntry: build.mutation({
      query: ({ id, ...data }) => ({
        url: `changelog/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Changelog"],
    }),
    deleteChangelogEntry: build.mutation({
      query: (id) => ({
        url: `changelog/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Changelog"],
    }),

    // SZMSZ (Vocational Statistics)
    getSZMSZByYear: build.query({
      query: (tanev) => `szmsz/${tanev}`,
      providesTags: (result, error, tanev) => [{ type: "SZMSZ", id: tanev }],
    }),
    getAllSZMSZ: build.query({
      query: ({ alapadatok_id, tanev }) => `szmsz/${alapadatok_id}/${tanev}`,
      providesTags: ["SZMSZ"],
    }),
    addSZMSZ: build.mutation({
      query: (data) => ({
        url: "szmsz",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SZMSZ"],
    }),
    bulkSaveSZMSZ: build.mutation({
      query: (body) => ({
        url: "szmsz/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SZMSZ"],
    }),
    updateSZMSZ: build.mutation({
      query: ({ id, ...data }) => ({
        url: `szmsz/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SZMSZ"],
    }),
    deleteSZMSZ: build.mutation({
      query: (id) => ({
        url: `szmsz/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SZMSZ"],
    }),

    // EgyOktatoraJutoTanulo (Students per Teacher)
    getAllEgyOktatoraJutoTanulo: build.query({
      query: () => "egy_oktatora_juto_tanulo",
      providesTags: ["EgyOktatoraJutoTanulo"],
    }),
    getEgyOktatoraJutoTanuloByAlapadatok: build.query({
      query: ({ alapadatok_id, year }) =>
        `egy_oktatora_juto_tanulo/${alapadatok_id}/${year}`,
      providesTags: (result, error, alapadatok_id) => [
        { type: "EgyOktatoraJutoTanulo", id: alapadatok_id },
      ],
    }),
    addEgyOktatoraJutoTanulo: build.mutation({
      query: (data) => ({
        url: "egy_oktatora_juto_tanulo",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["EgyOktatoraJutoTanulo"],
    }),
    updateEgyOktatoraJutoTanulo: build.mutation({
      query: ({ id, ...data }) => ({
        url: `egy_oktatora_juto_tanulo/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["EgyOktatoraJutoTanulo"],
    }),

    // intezmenyi_nevelesi_mutatok (Institutional Education Level)
    getIntezmenyiNeveltsegiMutatokByYear: build.query({
      query: ({ alapadatok_id, tanev }) =>
        `intezmenyi_neveltsegi_mutatok/${alapadatok_id}/${tanev}`,
      providesTags: (result, error, tanev) => [
        { type: "IntezmenyiNeveltsegiMutatok", id: tanev },
      ],
    }),
    addIntezmenyiNeveltsegiMutatok: build.mutation({
      query: (data) => ({
        url: "intezmenyi_neveltsegi_mutatok",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["IntezmenyiNeveltsegiMutatok"],
    }),
    updateIntezmenyiNeveltsegiMutatok: build.mutation({
      query: ({ id, tanev_kezdete, ...data }) => ({
        url: `intezmenyi_neveltsegi_mutatok/${id}/${tanev_kezdete}`,
        method: "PUT",
        body: { tanev_kezdete, ...data },
      }),
      invalidatesTags: ["IntezmenyiNeveltsegiMutatok"],
    }),
    bulkSaveIntezmenyiNeveltseg: build.mutation({
      query: (body) => ({
        url: "intezmenyi_neveltsegi_mutatok/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["IntezmenyiNeveltsegiMutatok"],
    }),


    // Versenyek (Competitions)
    getVersenyKategoriak: build.query({
      query: () => "versenyek/kategoriak",
      providesTags: ["VersenyKategoria"],
    }),
    getVersenyek: build.query({
      query: ({ alapadatok_id, tanev_kezdete }) =>
        tanev_kezdete !== undefined && tanev_kezdete !== null
          ? `versenyek/${alapadatok_id}/${tanev_kezdete}`
          : `versenyek/${alapadatok_id}`,
      providesTags: (result, error, params) => [
        { type: "Versenyek", id: params?.alapadatok_id },
        "Versenyek"
      ],
    }),
    addVersenyek: build.mutation({
      query: (data) => ({
        url: "versenyek",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Versenyek", "VersenyKategoria"],
    }),
    updateVersenyek: build.mutation({
      query: ({ id, ...data }) => ({
        url: `versenyek/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Versenyek"],
    }),
    deleteVersenyek: build.mutation({
      query: (id) => ({
        url: `versenyek/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Versenyek"],
    }),

    // Elegedettseg (Satisfaction measurement)
    getElegedettseg: build.query({
      query: ({ alapadatok_id, tanev_kezdete }) => {
        const year = tanev_kezdete !== undefined && tanev_kezdete !== null ? tanev_kezdete : getCurrentSchoolYearStart();
        if (alapadatok_id) {
          return `elegedettseg/${alapadatok_id}/${year}`;
        }
        return `elegedettseg/${year}`;
      },
      providesTags: (result, error, params) => [
        { type: "Elegedettseg", id: params?.alapadatok_id || "ALL" },
        "Elegedettseg",
      ],
    }),
    addElegedettseg: build.mutation({
      query: (data) => ({
        url: "elegedettseg",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Elegedettseg"],
    }),
    updateElegedettseg: build.mutation({
      query: ({ id, ...data }) => ({
        url: `elegedettseg/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Elegedettseg"],
    }),
    deleteElegedettseg: build.mutation({
      query: (id) => ({
        url: `elegedettseg/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Elegedettseg"],
    }),

    // ElegedettsegMeres (Partner satisfaction measurement)
    getElegedettsegMeres: build.query({
      query: ({ alapadatok_id, tanev_kezdete }) => {
        const year = tanev_kezdete !== undefined && tanev_kezdete !== null ? tanev_kezdete : getCurrentSchoolYearStart();
        if (alapadatok_id) {
          return `elegedettseg_meres/${alapadatok_id}/${year}`;
        }
        return `elegedettseg_meres/${year}`;
      },
      providesTags: (result, error, params) => [
        { type: "ElegedettsegMeres", id: params?.alapadatok_id || "ALL" },
        "ElegedettsegMeres",
      ],
    }),
    addElegedettsegMeres: build.mutation({
      query: (data) => ({
        url: "elegedettseg_meres",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ElegedettsegMeres"],
    }),
    updateElegedettsegMeres: build.mutation({
      query: ({ id, ...data }) => ({
        url: `elegedettseg_meres/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ElegedettsegMeres"],
    }),

    // Logs management endpoints (Admin/Superadmin only)
    getLogs: build.query({
      query: ({
        page = 1,
        limit = 50,
        level,
        method,
        userId,
        startDate,
        endDate,
      } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());

        if (level) params.append("level", level);
        if (method) params.append("method", method);
        if (userId) params.append("userId", userId);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        return `logs?${params.toString()}`;
      },
      providesTags: (result, error, params) => [
        { type: "Logs", id: `page-${params?.page || 1}` },
        "Logs",
      ],
    }),
    getLogById: build.query({
      query: (id) => `logs/${id}`,
      providesTags: (result, error, id) => [{ type: "Logs", id }],
    }),
    deleteLogs: build.mutation({
      query: ({ before, level, method } = {}) => {
        const params = new URLSearchParams();
        if (before) params.append("before", before);
        if (level) params.append("level", level);
        if (method) params.append("method", method);

        return {
          url: `logs?${params.toString()}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Logs"],
    }),

    // Dobbantó program endpoints
    getDobbanto: build.query({
      query: ({ alapadatok_id, tanev } = {}) => {
        if (alapadatok_id && tanev) {
          return `dobbanto/${tanev}`;
        } else if (tanev) {
          return `dobbanto/${tanev}`;
        }
        // Default to current year if no tanev provided
        return `dobbanto/${new Date().getFullYear()}`;
      },
      providesTags: (result, error, params) => [
        { type: "Dobbanto", id: params?.alapadatok_id || "all" },
        "Dobbanto",
      ],
    }),
    addDobbanto: build.mutation({
      query: (data) => ({
        url: "dobbanto",
        method: "POST",
        body: {
          alapadatok_id: data.alapadatok_id,
          tanev_kezdete: data.tanev_kezdete,
          dobbanto_szama: data.dobbanto_szama,
          tanulok_osszesen: data.tanulok_osszesen,
        },
      }),
      invalidatesTags: (result, error, data) => [
        { type: "Dobbanto", id: data.alapadatok_id },
        "Dobbanto",
      ],
    }),
    updateDobbanto: build.mutation({
      query: ({ id, ...data }) => ({
        url: `dobbanto/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { alapadatok_id }) => [
        { type: "Dobbanto", id: alapadatok_id },
        "Dobbanto",
      ],
    }),
    deleteDobbanto: build.mutation({
      query: (id) => ({
        url: `dobbanto/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Dobbanto"],
    }),

    // Szakirany and Szakma endpoints
    getSzakiranyList: build.query({
      query: () => "szakirany",
      providesTags: ["Szakirany"],
    }),
    getSzakmaList: build.query({
      query: () => "szakma",
      providesTags: ["Szakma"],
    }),

    // Remove szakirany from school (permanent deletion)
    removeSzakiranyFromSchool: build.mutation({
      query: ({ alapadatokId, szakiranyId }) => ({
        url: `alapadatok/removeSzakirany/${alapadatokId}/${szakiranyId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Alapadatok", "Szakirany"],
    }),

    // Remove szakma from school (permanent deletion)
    removeSzakmaFromSchool: build.mutation({
      query: ({ alapadatokId, szakmaId }) => ({
        url: `alapadatok/removeSzakma/${alapadatokId}/${szakmaId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Alapadatok", "Szakma"],
    }),

    // User management endpoints

    // Elegedettseg (Employer Satisfaction / Graduate Satisfaction)
    getAllElegedettseg: build.query({
      query: () => `elegedettseg/${getCurrentSchoolYearStart()}`,
      providesTags: ["Elegedettseg"],
    }),
    addElegedettseg: build.mutation({
      query: (data) => ({
        url: "elegedettseg",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Elegedettseg"],
    }),
    updateElegedettseg: build.mutation({
      query: ({ id, ...data }) => ({
        url: `elegedettseg/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Elegedettseg"],
    }),

    // ElegedettsegMeres (Satisfaction Measurement Results - Indicator 16)
    getAllElegedettsegMeres: build.query({
      query: (tanev) => `elegedettseg_meres/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: ["ElegedettsegMeres"],
    }),
    getElegedettsegMeresByAlapadatok: build.query({
      query: ({ alapadatokId, tanev }) => `elegedettseg_meres/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: ["ElegedettsegMeres"],
    }),
    addElegedettsegMeres: build.mutation({
      query: (data) => ({
        url: "elegedettseg_meres",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ElegedettsegMeres"],
    }),
    updateElegedettsegMeres: build.mutation({
      query: ({ id, ...data }) => ({
        url: `elegedettseg_meres/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ElegedettsegMeres"],
    }),
    // ── Indicator 22: Szakmai Továbbképzések ────────────────────────────
    getSzakmaiTovabbkepzesekBySchool: build.query({
      query: (alapadatok_id) => `szakmai_tovabbkepzes/${alapadatok_id}`,
      providesTags: (result, error, alapadatok_id) => [
        { type: "SzakmaiTovabbkepzesek", id: alapadatok_id },
        "SzakmaiTovabbkepzesek",
      ],
    }),
    upsertSzakmaiTovabbkepzesek: build.mutation({
      query: (data) => ({
        url: "szakmai_tovabbkepzes",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SzakmaiTovabbkepzesek"],
    }),

    // ── Indicator 13: Intézményi Elismerések (dinámikus) ────────────────────
    getIntézményiElismeresekBySchool: build.query({
      query: (alapadatok_id) => `intezmenyi_elismeresek/${alapadatok_id}`,
      providesTags: (result, error, alapadatok_id) => [
        { type: "IntezményiElismeresek", id: alapadatok_id },
        "IntezményiElismeresek",
      ],
    }),
    getIntézményiElismeresekByYear: build.query({
      query: ({ alapadatok_id, tanev_kezdete }) =>
        `intezmenyi_elismeresek/${alapadatok_id}/${tanev_kezdete}`,
      providesTags: (result, error, params) => [
        { type: "IntezményiElismeresek", id: `${params?.alapadatok_id}-${params?.tanev_kezdete}` },
        "IntezményiElismeresek",
      ],
    }),
    addIntézményiElismeresek: build.mutation({
      query: (data) => ({
        url: "intezmenyi_elismeresek",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["IntezményiElismeresek"],
    }),
    updateIntézményiElismeresek: build.mutation({
      query: ({ id, ...data }) => ({
        url: `intezmenyi_elismeresek/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["IntezményiElismeresek"],
    }),
    deleteIntézményiElismeresek: build.mutation({
      query: (id) => ({
        url: `intezmenyi_elismeresek/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["IntezményiElismeresek"],
    }),

    // ── Indicator 13: Munkavállalók Elismerései (fix struktúrájú) ─────────
    getMunkavallalokElismeresekBySchool: build.query({
      query: (alapadatok_id) => `munkavallalok_elismeresek/${alapadatok_id}`,
      providesTags: (result, error, alapadatok_id) => [
        { type: "MunkavallalokElismeresek", id: alapadatok_id },
        "MunkavallalokElismeresek",
      ],
    }),
    getMunkavallalokElismeresekByYear: build.query({
      query: ({ alapadatok_id, tanev_kezdete }) =>
        `munkavallalok_elismeresek/${alapadatok_id}/${tanev_kezdete}`,
      providesTags: (result, error, params) => [
        { type: "MunkavallalokElismeresek", id: `${params?.alapadatok_id}-${params?.tanev_kezdete}` },
        "MunkavallalokElismeresek",
      ],
    }),
    upsertMunkavallalokElismeresek: build.mutation({
      query: (data) => ({
        url: "munkavallalok_elismeresek",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["MunkavallalokElismeresek"],
    }),

    // Pályázatok (Indicator 24)
    getPalyazatok: build.query({
      query: ({ alapadatokId }) => `palyazatok/alapadatok/${alapadatokId}`,
      providesTags: (result, error, { alapadatokId }) => [
        { type: "Palyazatok", id: alapadatokId },
        "Palyazatok"
      ],
    }),
    addPalyazatok: build.mutation({
      query: (data) => ({
        url: "palyazatok",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Palyazatok"],
    }),
    updatePalyazatok: build.mutation({
      query: ({ id, ...data }) => ({
        url: `palyazatok/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Palyazatok"],
    }),
    deletePalyazatok: build.mutation({
      query: (id) => ({
        url: `palyazatok/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Palyazatok"],
    }),
    // Projektek (Indicator 29)
    getProjektek: build.query({
      query: (params) => {
        let url = `projektek`;
        if (params?.alapadatok_id) {
          url += `?alapadatok_id=${params.alapadatok_id}`;
        }
        return url;
      },
      providesTags: ["Projektek"],
    }),
    addProjektek: build.mutation({
      query: (data) => ({
        url: "projektek",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Projektek"],
    }),
    updateProjektek: build.mutation({
      query: ({ id, ...data }) => ({
        url: `projektek/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Projektek"],
    }),
    deleteProjektek: build.mutation({
      query: (id) => ({
        url: `projektek/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Projektek"],
    }),
    // Szervezetfejlesztes (Indicator 33)
    getSzervezetfejlesztes: build.query({
      query: ({ alapadatokId, tanev }) => `szervezetfejlesztes/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "Szervezetfejlesztes", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "Szervezetfejlesztes"
      ],
    }),
    addSzervezetfejlesztes: build.mutation({
      query: (data) => ({
        url: "szervezetfejlesztes",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Szervezetfejlesztes"],
    }),
    updateSzervezetfejlesztes: build.mutation({
      query: ({ id, ...data }) => ({
        url: `szervezetfejlesztes/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Szervezetfejlesztes"],
    }),
    deleteSzervezetfejlesztes: build.mutation({
      query: (id) => ({
        url: `szervezetfejlesztes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Szervezetfejlesztes"],
    }),

    // DualisKepzohelyek (Indicator 30)
    getDualisKepzohelyek: build.query({
      query: ({ alapadatokId, tanev }) => `dualis_kepzohelyek/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "DualisKepzohelyek", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "DualisKepzohelyek"
      ],
    }),
    addDualisKepzohelyek: build.mutation({
      query: (data) => ({
        url: "dualis_kepzohelyek",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DualisKepzohelyek"],
    }),
    updateDualisKepzohelyek: build.mutation({
      query: ({ id, ...data }) => ({
        url: `dualis_kepzohelyek/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["DualisKepzohelyek"],
    }),
    deleteDualisKepzohelyek: build.mutation({
      query: (id) => ({
        url: `dualis_kepzohelyek/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["DualisKepzohelyek"],
    }),

    // InnovaciosTevekenysegek (Indicator 34)
    getInnovaciosTevekenysegek: build.query({
      query: ({ alapadatokId, tanev }) => `innovacios_tevekenysegek/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "InnovaciosTevekenysegek", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "InnovaciosTevekenysegek"
      ],
    }),
    addInnovaciosTevekenysegek: build.mutation({
      query: (data) => ({
        url: "innovacios_tevekenysegek",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["InnovaciosTevekenysegek"],
    }),
    updateInnovaciosTevekenysegek: build.mutation({
      query: ({ id, ...data }) => ({
        url: `innovacios_tevekenysegek/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["InnovaciosTevekenysegek"],
    }),
    deleteInnovaciosTevekenysegek: build.mutation({
      query: (id) => ({
        url: `innovacios_tevekenysegek/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["InnovaciosTevekenysegek"],
    }),

    // SzakkepzesZolditese (Indicator 36)
    getSzakkepzesZolditese: build.query({
      query: ({ alapadatokId, tanev }) => `szakkepzes_zolditese/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "SzakkepzesZolditese", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "SzakkepzesZolditese"
      ],
    }),
    addSzakkepzesZolditese: build.mutation({
      query: (data) => ({
        url: "szakkepzes_zolditese",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["SzakkepzesZolditese"],
    }),
    updateSzakkepzesZolditese: build.mutation({
      query: ({ id, ...data }) => ({
        url: `szakkepzes_zolditese/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SzakkepzesZolditese"],
    }),
    deleteSzakkepzesZolditese: build.mutation({
      query: (id) => ({
        url: `szakkepzes_zolditese/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SzakkepzesZolditese"],
    }),

    // PalyaOrientacio (Indicator 31)
    getPalyaOrientacio: build.query({
      query: ({ alapadatokId, tanev }) => `palya_orientacio/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "PalyaOrientacio", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "PalyaOrientacio"
      ],
    }),
    addPalyaOrientacio: build.mutation({
      query: (data) => ({
        url: "palya_orientacio",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["PalyaOrientacio"],
    }),
    updatePalyaOrientacio: build.mutation({
      query: ({ id, ...data }) => ({
        url: `palya_orientacio/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["PalyaOrientacio"],
    }),
    deletePalyaOrientacio: build.mutation({
      query: (id) => ({
        url: `palya_orientacio/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PalyaOrientacio"],
    }),

    // DigitalisKompetencia (Indicator 35)
    getDigitalisKompetencia: build.query({
      query: ({ alapadatokId, tanev }) => `digitalis_kompetencia/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "DigitalisKompetencia", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "DigitalisKompetencia"
      ],
    }),
    addDigitalisKompetencia: build.mutation({
      query: (data) => ({
        url: "digitalis_kompetencia",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["DigitalisKompetencia"],
    }),
    updateDigitalisKompetencia: build.mutation({
      query: ({ id, ...data }) => ({
        url: `digitalis_kompetencia/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["DigitalisKompetencia"],
    }),

    // EgyuttmukodesekSzama (Indicator 32)
    getEgyuttmukodesekSzama: build.query({
      query: ({ alapadatokId, tanev }) => `egyuttmukudesek_szama/${alapadatokId}/${tanev || getCurrentSchoolYearStart()}`,
      providesTags: (result, error, { alapadatokId, tanev }) => [
        { type: "EgyuttmukodesekSzama", id: `${alapadatokId}-${tanev || getCurrentSchoolYearStart()}` },
        "EgyuttmukodesekSzama"
      ],
    }),
    addEgyuttmukodesekSzama: build.mutation({
      query: (data) => ({
        url: "egyuttmukudesek_szama",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["EgyuttmukodesekSzama"],
    }),
    updateEgyuttmukodesekSzama: build.mutation({
      query: ({ id, ...data }) => ({
        url: `egyuttmukudesek_szama/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["EgyuttmukodesekSzama"],
    }),
    deleteEgyuttmukodesekSzama: build.mutation({
      query: (id) => ({
        url: `egyuttmukudesek_szama/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EgyuttmukodesekSzama"],
    }),

    // NyelvvizsgakSzama (Indicator 28)
    getNyelvvizsgakSzama: build.query({
      query: ({ alapadatok_id, tanev }) => `nyelvvizsgak_szama/${alapadatok_id}/${tanev}`,
      providesTags: (result, error, { alapadatok_id, tanev }) => [
        { type: "NyelvvizsgakSzama", id: `${alapadatok_id}-${tanev}` },
        "NyelvvizsgakSzama",
      ],
    }),
    addNyelvvizsgakSzama: build.mutation({
      query: (data) => ({
        url: "nyelvvizsgak_szama",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["NyelvvizsgakSzama"],
    }),
    updateNyelvvizsgakSzama: build.mutation({
      query: ({ id, ...data }) => ({
        url: `nyelvvizsgak_szama/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["NyelvvizsgakSzama"],
    }),
    deleteNyelvvizsgakSzama: build.mutation({
      query: (id) => ({
        url: `nyelvvizsgak_szama/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["NyelvvizsgakSzama"],
    }),

    // FormHistory endpoints
    getFormHistory: build.query({
      query: ({ alapadatok_id, table_name }) => `form_history/${alapadatok_id}/${table_name}`,
      providesTags: ["FormHistory"],
    }),
    rollbackFormHistory: build.mutation({
      query: (id) => ({
        url: `form_history/rollback/${id}`,
        method: "POST",
      }),
      invalidatesTags: ["FormHistory"],
    }),
  }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
  useGetTanugyiAdatokQuery,
  useLazyGetTanugyiAdatokQuery,
  useAddTanugyiAdatokMutation,
  useGetAlkalmazottAdatokQuery,
  useLazyGetAlkalmazottAdatokQuery,
  useLazyGetEngedelyezettOratomegQuery,
  useUpsertEngedelyezettOratomegMutation,
  useAddAlkalmazottAdatokMutation,
  useGetAlapadatokQuery,
  useGetAllAlapadatokQuery,
  useAddAlapadatokMutation,
  useUpdateAlapadatokMutation,
  useDeleteAlapadatokMutation,
  useGetKompetenciaQuery,
  useAddKompetenciaMutation,
  useUpdateKompetenciaMutation,
  useGetTanuloLetszamQuery,
  useAddTanuloLetszamBulkMutation,
  useAddTanuloLetszamMutation,
  useUpdateTanuloLetszamMutation,
  useDeleteTanuloLetszamMutation,
  useGetUsersQuery,
  useGetFilteredUsersQuery,
  useGetUserByIdQuery,
  useAddUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useChangeUserPasswordMutation,
  useDisable2FAForUserMutation,
  useUpdateMeMutation,
  useChangeMePasswordMutation,
  useLoginMutation,
  useGoogleLoginMutation,
  useGenerate2FAMutation,
  useVerify2FAMutation,
  useDisable2FAMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useForgotPasswordMutation,
  useGetTableListQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useLockTableMutation,
  useUnlockTableMutation,
  useAddTanuloAdatszolgaltatasMutation,
  useGetTanuloAdatszolgaltatasQuery,
  useAddOktatoAdatszolgaltatasMutation,
  useGetOktatoAdatszolgaltatasQuery,
  // Educational Indicators hooks
  useGetElhelyezkedesByYearQuery,
  useGetElhelyezkedesBySchoolAndYearQuery,
  useGetAllElhelyezkedesQuery,
  useAddElhelyezkedesMutation,
  useUpdateElhelyezkedesMutation,
  useDeleteElhelyezkedesMutation,
  useDeleteElhelyezkedesBySchoolAndYearMutation,
  useGetAllFelvettekSzamaQuery,
  useGetFelvettekSzamaByAlapadatokIdAndYearQuery,
  useAddFelvettekSzamaMutation,
  useUpdateFelvettekSzamaMutation,
  useDeleteFelvettekSzamaMutation,
  useGetSajatosNevelesuTanulokByYearQuery,
  useGetAllSajatosNevelesuTanulokQuery,
  useAddSajatosNevelesuTanulokMutation,
  useUpdateSajatosNevelesuTanulokMutation,
  useDeleteSajatosNevelesuTanulokMutation,
  useGetHHesHHHNevelesuTanulokByYearQuery,
  useGetAllHHesHHHNevelesuTanulokQuery,
  useAddHHesHHHNevelesuTanulokMutation,
  useUpdateHHesHHHNevelesuTanulokMutation,
  useDeleteHHesHHHNevelesuTanulokMutation,
  useGetVizsgaeredmenyekByYearQuery,
  useGetVizsgaeredmenyekBySchoolAndYearQuery,
  useGetAllVizsgaeredmenyekQuery,
  useAddVizsgaeredmenyekMutation,
  useUpdateVizsgaeredmenyekMutation,
  useDeleteVizsgaeredmenyekMutation,
  useGetSzakmaiRendezvenyekByYearQuery,
  useGetSzakmaiRendezvenyekBySchoolAndYearQuery,
  useAddSzakmaiRendezvenyekMutation,
  useUpdateSzakmaiRendezvenyekMutation,
  useDeleteSzakmaiRendezvenyekMutation,
  useGetSzakmaiVizsgaEredmenyekByYearQuery,
  useGetAllSzakmaiVizsgaEredmenyekQuery,
  useAddSzakmaiVizsgaEredmenyekMutation,
  useUpdateSzakmaiVizsgaEredmenyekMutation,
  useDeleteSzakmaiVizsgaEredmenyekMutation,

  useGetMuhelyiskolaQuery,
  useLazyGetMuhelyiskolaQuery,
  useAddMuhelyiskolaMutation,
  useUpdateMuhelyiskolaMutation,
  useDeleteMuhelyiskolaMutation,
  useGetNSZFHByYearQuery,
  useGetNSZFHBySchoolAndYearQuery,
  useGetAllNSZFHQuery,
  useAddNSZFHMutation,
  useUpdateNSZFHMutation,
  useDeleteNSZFHMutation,
  useGetSZMSZByYearQuery,
  useGetAllSZMSZQuery,
  useAddSZMSZMutation,
  useBulkSaveSZMSZMutation,
  useUpdateSZMSZMutation,
  useDeleteSZMSZMutation,
  useGetAllEgyOktatoraJutoTanuloQuery,
  useGetEgyOktatoraJutoTanuloByAlapadatokQuery,
  useAddEgyOktatoraJutoTanuloMutation,
  useUpdateEgyOktatoraJutoTanuloMutation,
  useGetIntezmenyiNeveltsegiMutatokByYearQuery,
  useAddIntezmenyiNeveltsegiMutatokMutation,
  useUpdateIntezmenyiNeveltsegiMutatokMutation,
  useBulkSaveIntezmenyiNeveltsegMutation,
  // Logs hooks
  useGetLogsQuery,
  useGetLogByIdQuery,
  useDeleteLogsMutation,
  // Dobbanto hooks
  useGetDobbantoQuery,
  useAddDobbantoMutation,
  useUpdateDobbantoMutation,
  useDeleteDobbantoMutation,
  // Szakirany and Szakma hooks
  useGetSzakiranyListQuery,
  useGetSzakmaListQuery,
  useRemoveSzakiranyFromSchoolMutation,
  useRemoveSzakmaFromSchoolMutation,
  // Changelog hooks
  useGetChangelogQuery,
  useAddChangelogEntryMutation,
  useUpdateChangelogEntryMutation,
  useDeleteChangelogEntryMutation,
  useGetHianyzasQuery,
  useAddHianyzasMutation,
  useUpdateHianyzasMutation,
  // Szakmai Továbbképzések hooks
  useGetSzakmaiTovabbkepzesekBySchoolQuery,
  useUpsertSzakmaiTovabbkepzesekMutation,
  // Versenyek hooks
  useGetVersenyKategoriakQuery,
  useGetVersenyekQuery,
  useAddVersenyekMutation,
  useUpdateVersenyekMutation,
  useDeleteVersenyekMutation,
  // Elegedettseg hooks
  useGetElegedettsegQuery,
  useAddElegedettsegMutation,
  useUpdateElegedettsegMutation,
  useDeleteElegedettsegMutation,
  // ElegedettsegMeres hooks
  useGetElegedettsegMeresQuery,
  useAddElegedettsegMeresMutation,
  useUpdateElegedettsegMeresMutation,
  // Intézményi Elismerések hooks (Indicator 13)
  useGetIntézményiElismeresekBySchoolQuery,
  useGetIntézményiElismeresekByYearQuery,
  useAddIntézményiElismeresekMutation,
  useUpdateIntézményiElismeresekMutation,
  useDeleteIntézményiElismeresekMutation,
  // Munkavállalók Elismerései hooks (Indicator 13)
  useGetMunkavallalokElismeresekBySchoolQuery,
  useGetMunkavallalokElismeresekByYearQuery,
  useUpsertMunkavallalokElismeresekMutation,
  useGetAllLemorzsolodasQuery,
  useGetLemorzsolodasBySchoolAndYearQuery,
  useAddLemorzsolodasMutation,
  useUpdateLemorzsolodasMutation,
  useDeleteLemorzsolodasMutation,
  // Palyazatok hooks
  useGetPalyazatokQuery,
  useAddPalyazatokMutation,
  useUpdatePalyazatokMutation,
  useDeletePalyazatokMutation,
  // Szervezetfejlesztes hooks
  useGetSzervezetfejlesztesQuery,
  useAddSzervezetfejlesztesMutation,
  useUpdateSzervezetfejlesztesMutation,
  useDeleteSzervezetfejlesztesMutation,
  // DualisKepzohelyek hooks
  useGetDualisKepzohelyekQuery,
  useAddDualisKepzohelyekMutation,
  useUpdateDualisKepzohelyekMutation,
  useDeleteDualisKepzohelyekMutation,
  // InnovaciosTevekenysegek hooks
  useGetInnovaciosTevekenysegekQuery,
  useAddInnovaciosTevekenysegekMutation,
  useUpdateInnovaciosTevekenysegekMutation,
  useDeleteInnovaciosTevekenysegekMutation,
  // SzakkepzesZolditese hooks
  useGetSzakkepzesZolditeseQuery,
  useAddSzakkepzesZolditeseMutation,
  useUpdateSzakkepzesZolditeseMutation,
  useDeleteSzakkepzesZolditeseMutation,
  // DigitalisKompetencia hooks
  useGetDigitalisKompetenciaQuery,
  useAddDigitalisKompetenciaMutation,
  useUpdateDigitalisKompetenciaMutation,
  // TanulmanyiEredmeny hooks
  useGetTanulmanyiEredmenyQuery,
  useAddTanulmanyiEredmenyMutation,
  useUpdateTanulmanyiEredmenyMutation,
  // PalyaOrientacio hooks
  useGetPalyaOrientacioQuery,
  useAddPalyaOrientacioMutation,
  useUpdatePalyaOrientacioMutation,
  useDeletePalyaOrientacioMutation,
  // EgyuttmukodesekSzama hooks
  useGetEgyuttmukodesekSzamaQuery,
  useAddEgyuttmukodesekSzamaMutation,
  useUpdateEgyuttmukodesekSzamaMutation,
  useDeleteEgyuttmukodesekSzamaMutation,
  // Projektek hooks
  useGetProjektekQuery,
  useAddProjektekMutation,
  useUpdateProjektekMutation,
  useDeleteProjektekMutation,
  // NyelvvizsgakSzama hooks (Indicator 28)
  useGetNyelvvizsgakSzamaQuery,
  useAddNyelvvizsgakSzamaMutation,
  useUpdateNyelvvizsgakSzamaMutation,
  useDeleteNyelvvizsgakSzamaMutation,

  // FormHistory hooks
  useGetFormHistoryQuery,
  useRollbackFormHistoryMutation,
  // Bug report hook
  useSubmitBugReportMutation,
  useGetReportedBugsQuery,
  useUpdateBugStatusMutation,
} = indicatorApi;
