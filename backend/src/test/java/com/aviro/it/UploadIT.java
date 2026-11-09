package com.aviro.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import com.aviro.entity.User;
import com.aviro.support.IntegrationTest;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class UploadIT extends IntegrationTest {

    private int upload(User u, MockMultipartFile f) throws Exception {
        return mvc.perform(
                        multipart("/users/upload-college-id")
                                .file(f)
                                .header("Authorization", "Bearer " + token(u)))
                .andReturn()
                .getResponse()
                .getStatus();
    }

    @Test
    void htmlPretendingToBeAPhotoIsRefused() throws Exception {
        User u = student("Upload Student");
        var html =
                new MockMultipartFile(
                        "file",
                        "id.png",
                        "image/png",
                        "<html><script>alert(1)</script></html>".getBytes());
        assertThat(upload(u, html)).isEqualTo(400);
    }

    @Test
    void wrongTypesAndHugeFilesAreRefused() throws Exception {
        User u = student("Upload Student Two");
        assertThat(
                        upload(
                                u,
                                new MockMultipartFile(
                                        "file",
                                        "id.pdf",
                                        "application/pdf",
                                        "%PDF-1.7".getBytes())))
                .isEqualTo(400);
        byte[] big = new byte[6 * 1024 * 1024];
        big[0] = (byte) 0xFF;
        big[1] = (byte) 0xD8;
        big[2] = (byte) 0xFF;
        assertThat(upload(u, new MockMultipartFile("file", "id.jpg", "image/jpeg", big)))
                .isEqualTo(400);
    }

    @Test
    void aRealPhotoIsAccepted() throws Exception {
        User u = student("Upload Student Three");
        u.setIsCollegeVerified(false);
        users.save(u);
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        assertThat(upload(u, new MockMultipartFile("file", "id.png", "image/png", png)))
                .isEqualTo(200);
    }

    private User withPendingPhoto(String name) throws Exception {
        User u = student(name);
        u.setIsCollegeVerified(false);
        users.save(u);
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        assertThat(upload(u, new MockMultipartFile("file", "id.png", "image/png", png)))
                .isEqualTo(200);
        User saved = users.findById(u.getId()).orElseThrow();
        assertThat(saved.getCollegeIdPicUrl()).isNotNull();
        assertThat(photoFile(saved)).exists();
        return saved;
    }

    private static java.io.File photoFile(User u) {
        String url = u.getCollegeIdPicUrl();
        return new java.io.File(
                System.getProperty("user.dir")
                        + "/uploads/college-ids/"
                        + url.substring(url.lastIndexOf('/') + 1));
    }

    private User admin() {
        User a = student("Photo Admin");
        a.setRole(com.aviro.enums.Role.ADMIN);
        return users.save(a);
    }

    @Test
    void approvedIdPhotoIsDeleted() throws Exception {
        User u = withPendingPhoto("Approve Me");
        java.io.File file = photoFile(u);
        assertThat(post("/admin/verify-college-id/" + u.getId(), admin(), null).ok()).isTrue();
        User after = users.findById(u.getId()).orElseThrow();
        assertThat(after.getIsCollegeVerified()).isTrue();
        assertThat(after.getCollegeIdPicUrl()).isNull();
        assertThat(file).doesNotExist();
    }

    @Test
    void rejectedIdPhotoIsDeleted() throws Exception {
        User u = withPendingPhoto("Reject Me");
        java.io.File file = photoFile(u);
        assertThat(post("/admin/reject-college-id/" + u.getId(), admin(), null).ok()).isTrue();
        assertThat(users.findById(u.getId()).orElseThrow().getCollegeIdPicUrl()).isNull();
        assertThat(file).doesNotExist();
    }
}
