<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // --- ROLE CONSTANTS ---
    const ROLE_GLOBAL_ADMIN = 'admin';
    const ROLE_PLANT_ADMIN  = 'plant_admin';

    /**
     *
     * @var array<int, string>
     */
    protected $fillable = ['name', 'email', 'password', 'role', 'plant_id'];

    /**
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // --- ROLE HELPERS ---
    public function isGlobalAdmin(): bool
    {
        return $this->role === self::ROLE_GLOBAL_ADMIN;
    }

    public function isPlantAdmin(): bool
    {
        return $this->role === self::ROLE_PLANT_ADMIN;
    }

    /**
     * Get the display label for the role
     */
    public function getRoleLabelAttribute(): string
    {
        return $this->isGlobalAdmin() ? 'Global Admin' : 'Plant Admin';
    }

    /**
     * Get the plant scope for queries.
     * Returns null for Global Admin (no filter), plant_id for Plant Admin.
     */
    public function getPlantScope(): ?int
    {
        return $this->isGlobalAdmin() ? null : $this->plant_id;
    }

    // --- RELATIONSHIP ---
    public function plant()
    {
        return $this->belongsTo(Plant::class);
    }
}
