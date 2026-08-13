package com.aviro.service;

import com.aviro.dto.request.ReviewRequest;
import com.aviro.dto.response.ApiResponse;
import com.aviro.entity.Booking;
import com.aviro.entity.Review;
import com.aviro.entity.User;
import com.aviro.exception.AviroException;
import com.aviro.repository.BookingRepository;
import com.aviro.repository.ReviewRepository;
import com.aviro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    @Transactional
    public ApiResponse<String> submitReview(String reviewerEmail, ReviewRequest request) {
        User reviewer = userRepository.findByEmail(reviewerEmail)
                .orElseThrow(() -> new AviroException("User not found"));
        User reviewee = userRepository.findById(request.getRevieweeId())
                .orElseThrow(() -> new AviroException("Reviewee not found"));
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new AviroException("Booking not found"));

        if (reviewRepository.existsByReviewerIdAndBookingId(reviewer.getId(), booking.getId())) {
            throw new AviroException("You have already reviewed this ride");
        }

        Review review = Review.builder()
                .reviewer(reviewer).reviewee(reviewee)
                .booking(booking).rating(request.getRating())
                .comment(request.getComment()).build();
        reviewRepository.save(review);

        // Update reviewee average rating
        Double avg = reviewRepository.getAverageRating(reviewee.getId());
        reviewee.setRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 5.0);
        userRepository.save(reviewee);

        return ApiResponse.success("Review submitted successfully!", null);
    }

    public ApiResponse<List<Review>> getUserReviews(Long userId) {
        return ApiResponse.success(reviewRepository.findByRevieweeIdOrderByCreatedAtDesc(userId));
    }
}
